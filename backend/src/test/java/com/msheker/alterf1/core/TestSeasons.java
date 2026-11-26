package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Consumer;

import com.msheker.alterf1.data.SessionResult;
import com.msheker.alterf1.data.SessionResult.Session;

/**
 * Fluent builder for synthetic {@link SessionResult} lists used by unit tests.
 * Derives default {@code actualPoints} from the real historical scoring table of the season.
 */
final class TestSeasons {

    private final int year;
    private final ScoringRules realRules;
    private final List<SessionResult> results = new ArrayList<>();

    private TestSeasons(int year) {
        this.year = year;
        this.realRules = ScoringSystem.historicalFor(year).historical(year);
    }

    static TestSeasons season(int year) {
        return new TestSeasons(year);
    }

    TestSeasons race(int round, String... driverIds) {
        return race(round, s -> s.order(driverIds));
    }

    TestSeasons race(int round, Consumer<SessionBuilder> config) {
        return addSession(round, Session.RACE, config);
    }

    TestSeasons halfPointsRace(int round, String... driverIds) {
        return race(round, s -> s.halfPoints().order(driverIds));
    }

    TestSeasons doublePointsRace(int round, String... driverIds) {
        return race(round, s -> s.doublePoints().order(driverIds));
    }

    TestSeasons indy500(int round, String... driverIds) {
        return race(round, s -> s.indy500().order(driverIds));
    }

    TestSeasons sprint(int round, String... driverIds) {
        return sprint(round, s -> s.order(driverIds));
    }

    TestSeasons sprint(int round, Consumer<SessionBuilder> config) {
        return addSession(round, Session.SPRINT, config);
    }

    List<SessionResult> build() {
        return List.copyOf(results);
    }

    private TestSeasons addSession(int round, Session session, Consumer<SessionBuilder> config) {
        SessionBuilder builder = new SessionBuilder();
        config.accept(builder);
        results.addAll(builder.build(year, round, session, realRules));
        return this;
    }

    static final class SessionBuilder {
        private final List<EntryBuilder> entries = new ArrayList<>();
        private int nextPosition = 1;
        private boolean indy500;
        private BigDecimal multiplier = BigDecimal.ONE;

        SessionBuilder order(String... driverIds) {
            for (String driverId : driverIds) {
                finish(driverId);
            }
            return this;
        }

        SessionBuilder finish(String driverId) {
            return finish(driverId, e -> {
            });
        }

        SessionBuilder finish(String driverId, Consumer<EntryBuilder> config) {
            int position = nextPosition++;
            EntryBuilder entry = new EntryBuilder(driverId, position, String.valueOf(position));
            config.accept(entry);
            entries.add(entry);
            return this;
        }

        SessionBuilder dnf(String driverId) {
            return dnf(driverId, e -> {
            });
        }

        SessionBuilder dnf(String driverId, Consumer<EntryBuilder> config) {
            EntryBuilder entry = new EntryBuilder(driverId, null, "DNF");
            config.accept(entry);
            entries.add(entry);
            return this;
        }

        SessionBuilder indy500() {
            this.indy500 = true;
            return this;
        }

        SessionBuilder halfPoints() {
            this.multiplier = new BigDecimal("0.5");
            return this;
        }

        SessionBuilder doublePoints() {
            this.multiplier = new BigDecimal("2");
            return this;
        }

        SessionBuilder fastestLap(String driverId) {
            entries.stream()
                    .filter(e -> e.driverId.equals(driverId))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Driver not in session: " + driverId))
                    .fastestLap();
            return this;
        }

        private List<SessionResult> build(int year, int round, Session session, ScoringRules realRules) {
            LocalDate raceDate = LocalDate.of(year, 1, 1).plusWeeks(round);
            String grandPrixId = indy500 ? "indianapolis-500" : "gp-" + round;
            int raceId = year * 100 + round;
            long fastestLapCount = entries.stream().filter(e -> e.fastestLap).count();

            List<SessionResult> built = new ArrayList<>(entries.size());
            for (int i = 0; i < entries.size(); i++) {
                EntryBuilder e = entries.get(i);
                BigDecimal actual = e.actualPointsOverride != null
                        ? e.actualPointsOverride
                        : defaultActualPoints(session, realRules, e, fastestLapCount);
                String abbr = e.driverId.substring(0, Math.min(3, e.driverId.length())).toUpperCase(Locale.ROOT);
                int laps = e.position != null ? 50 : 0;
                built.add(new SessionResult(
                        year, round, raceId, grandPrixId, raceDate, indy500, session,
                        i + 1, e.position, e.positionText,
                        e.driverId, e.driverId, abbr,
                        e.constructorId, "engine",
                        false, e.fastestLap,
                        laps, 50, 50, actual));
            }
            return built;
        }

        private BigDecimal defaultActualPoints(Session session, ScoringRules realRules, EntryBuilder entry,
                long fastestLapCount) {
            if (session == Session.SPRINT) {
                return entry.position != null ? realRules.sprintPointsFor(entry.position) : BigDecimal.ZERO;
            }
            BigDecimal points = entry.position != null ? realRules.racePointsFor(entry.position) : BigDecimal.ZERO;
            FastestLapRule flRule = realRules.fastestLap();
            if (entry.fastestLap && flRule != null && flRule.eligible(entry.position)) {
                BigDecimal bonus = flRule.splitWhenShared() && fastestLapCount > 1
                        ? flRule.points().divide(BigDecimal.valueOf(fastestLapCount), 8, RoundingMode.HALF_EVEN)
                        : flRule.points();
                points = points.add(bonus);
            }
            return points.multiply(multiplier);
        }
    }

    static final class EntryBuilder {
        private final String driverId;
        private final Integer position;
        private final String positionText;
        private String constructorId;
        private boolean fastestLap;
        private BigDecimal actualPointsOverride;

        private EntryBuilder(String driverId, Integer position, String positionText) {
            this.driverId = driverId;
            this.position = position;
            this.positionText = positionText;
            this.constructorId = "team-" + driverId;
        }

        EntryBuilder constructor(String constructorId) {
            this.constructorId = constructorId;
            return this;
        }

        EntryBuilder fastestLap() {
            this.fastestLap = true;
            return this;
        }

        EntryBuilder actualPoints(BigDecimal actualPoints) {
            this.actualPointsOverride = actualPoints;
            return this;
        }

        EntryBuilder actualPoints(String actualPoints) {
            return actualPoints(new BigDecimal(actualPoints));
        }
    }
}
