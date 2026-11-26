package com.msheker.alterf1.core;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.msheker.alterf1.data.SessionResult;

/**
 * What really happened in one Grand Prix beyond the finishing order, derived from the points
 * really awarded under the rules really used that season. F1DB does not flag these, and the
 * stewards' decisions behind them vary from race to race, so they are read from the data
 * instead of being hard-coded:
 * <ul>
 *   <li>a race multiplier: half points for a race cut short, double points (2014)</li>
 *   <li>ineligible finishers (F2 cars in 1958/67/69, unregistered second cars in 1984/87,
 *       penalties such as Hill in France 1963) and whether the points then passed to the next
 *       car (1967/69) or were not awarded (1958/84/87)</li>
 *   <li>how a shared car's points were divided between its drivers (1950s)</li>
 *   <li>how a shared fastest lap was divided (1950s)</li>
 * </ul>
 * The same facts are then applied under any other scoring system.
 */
final class RaceFacts {

    private static final BigDecimal EPSILON = new BigDecimal("0.02");
    private static final int SCALE = 8;

    final BigDecimal multiplier;
    final boolean pointsPassedDown;
    private final Set<Integer> ineligible;
    private final Map<Integer, Integer> scoringPosition;
    private final Map<Integer, BigDecimal> pointsShare;
    private final Map<Integer, BigDecimal> fastestLapShare;

    private RaceFacts(BigDecimal multiplier, boolean pointsPassedDown, Set<Integer> ineligible,
            Map<Integer, Integer> scoringPosition, Map<Integer, BigDecimal> pointsShare,
            Map<Integer, BigDecimal> fastestLapShare) {
        this.multiplier = multiplier;
        this.pointsPassedDown = pointsPassedDown;
        this.ineligible = ineligible;
        this.scoringPosition = scoringPosition;
        this.pointsShare = pointsShare;
        this.fastestLapShare = fastestLapShare;
    }

    /** No adjustments: every classified car scores for its own position. */
    static final RaceFacts NONE = new RaceFacts(BigDecimal.ONE, false, Set.of(), Map.of(), Map.of(), Map.of());

    boolean ineligible(SessionResult row) {
        return ineligible.contains(row.positionDisplayOrder());
    }

    /** The position the row scores points for (its own, or its rank among eligible cars). */
    int scoringPosition(SessionResult row) {
        return scoringPosition.getOrDefault(row.positionDisplayOrder(), row.position());
    }

    /** Share of the position's points this row really got, if the data tells; else {@code null}. */
    BigDecimal pointsShare(SessionResult row) {
        return pointsShare.get(row.positionDisplayOrder());
    }

    /** Share of the fastest-lap bonus this row really got, if the data tells; else {@code null}. */
    BigDecimal fastestLapShare(SessionResult row) {
        return fastestLapShare.get(row.positionDisplayOrder());
    }

    static RaceFacts derive(List<SessionResult> rows, ScoringRules real) {
        BigDecimal multiplier = StandingsEngine.detectMultiplier(rows, real);
        List<SessionResult> classified = rows.stream()
                .filter(SessionResult::classified)
                .sorted(Comparator.comparing(SessionResult::position).thenComparing(SessionResult::positionDisplayOrder))
                .toList();
        Map<Integer, Long> carsAt = classified.stream()
                .collect(Collectors.groupingBy(SessionResult::position, Collectors.counting()));
        long fastestLaps = rows.stream().filter(SessionResult::fastestLap).count();
        boolean sharedCars = carsAt.values().stream().anyMatch(n -> n > 1);

        // Hypothesis 1: every car scores for its own position; ineligible cars score nothing.
        Map<Integer, Integer> own = new HashMap<>();
        Set<Integer> ineligibleOwn = new HashSet<>();
        for (SessionResult r : classified) {
            own.put(r.positionDisplayOrder(), r.position());
            if (carsAt.get(r.position()) == 1 && expected(real, r.position(), multiplier).signum() > 0
                    && actual(r).signum() == 0) {
                ineligibleOwn.add(r.positionDisplayOrder());
            }
        }
        // Hypothesis 2: ineligible cars are removed and the points pass to the cars behind.
        Map<Integer, Integer> passed = new HashMap<>();
        Set<Integer> ineligiblePassed = new HashSet<>();
        if (!sharedCars) {
            int rank = 1;
            for (SessionResult r : classified) {
                if (expected(real, rank, multiplier).signum() > 0 && actual(r).signum() == 0) {
                    ineligiblePassed.add(r.positionDisplayOrder());
                } else {
                    passed.put(r.positionDisplayOrder(), rank++);
                }
            }
        }
        boolean pointsPassedDown = !sharedCars && !ineligibleOwn.isEmpty()
                && consistent(classified, passed, ineligiblePassed, real, multiplier, fastestLaps)
                        > consistent(classified, own, ineligibleOwn, real, multiplier, fastestLaps);
        Map<Integer, Integer> scoring = pointsPassedDown ? passed : own;
        Set<Integer> ineligible = pointsPassedDown ? ineligiblePassed : ineligibleOwn;

        Map<Integer, BigDecimal> pointsShare = new HashMap<>();
        Map<Integer, BigDecimal> fastestLapShare = new HashMap<>();
        for (SessionResult r : classified) {
            int key = r.positionDisplayOrder();
            BigDecimal base = expected(real, scoring.get(key), multiplier);
            if (ineligible.contains(key) || base.signum() == 0 || carsAt.get(r.position()) == 1) {
                continue;
            }
            // Shared car: how much of the position's points did this driver really get?
            BigDecimal driverPoints = actual(r).subtract(defaultFastestLap(real, r, multiplier, fastestLaps));
            pointsShare.put(key, clamp(driverPoints.divide(base, SCALE, RoundingMode.HALF_EVEN)));
        }
        if (real.fastestLap() != null) {
            BigDecimal bonus = real.fastestLap().points().multiply(multiplier);
            for (SessionResult r : rows) {
                int key = r.positionDisplayOrder();
                if (!r.fastestLap() || ineligible.contains(key)
                        || (r.classified() && carsAt.get(r.position()) > 1)) {
                    continue;
                }
                BigDecimal positionPoints = r.classified() ? expected(real, scoring.get(key), multiplier) : BigDecimal.ZERO;
                BigDecimal share = clamp(actual(r).subtract(positionPoints).divide(bonus, SCALE, RoundingMode.HALF_EVEN));
                BigDecimal even = BigDecimal.ONE.divide(BigDecimal.valueOf(fastestLaps), SCALE, RoundingMode.HALF_EVEN);
                fastestLapShare.put(key, share.subtract(even).abs().compareTo(EPSILON) <= 0 ? even : share);
            }
        }
        return new RaceFacts(multiplier, pointsPassedDown, ineligible, scoring, pointsShare, fastestLapShare);
    }

    private static int consistent(List<SessionResult> classified, Map<Integer, Integer> scoring, Set<Integer> ineligible,
            ScoringRules real, BigDecimal multiplier, long fastestLaps) {
        int matches = 0;
        for (SessionResult r : classified) {
            int key = r.positionDisplayOrder();
            if (ineligible.contains(key)) {
                matches++;
                continue;
            }
            BigDecimal predicted = expected(real, scoring.get(key), multiplier)
                    .add(defaultFastestLap(real, r, multiplier, fastestLaps));
            if (predicted.subtract(actual(r)).abs().compareTo(EPSILON) <= 0) {
                matches++;
            }
        }
        return matches;
    }

    private static BigDecimal expected(ScoringRules real, Integer position, BigDecimal multiplier) {
        return position == null ? BigDecimal.ZERO : real.racePointsFor(position).multiply(multiplier);
    }

    private static BigDecimal defaultFastestLap(ScoringRules real, SessionResult r, BigDecimal multiplier, long fastestLaps) {
        FastestLapRule rule = real.fastestLap();
        if (rule == null || !r.fastestLap() || !rule.eligible(r.position())) {
            return BigDecimal.ZERO;
        }
        BigDecimal bonus = rule.points().multiply(multiplier);
        return rule.splitWhenShared() && fastestLaps > 1
                ? bonus.divide(BigDecimal.valueOf(fastestLaps), SCALE, RoundingMode.HALF_EVEN)
                : bonus;
    }

    private static BigDecimal actual(SessionResult r) {
        return r.actualPoints() == null ? BigDecimal.ZERO : r.actualPoints();
    }

    private static BigDecimal clamp(BigDecimal value) {
        return value.max(BigDecimal.ZERO).min(BigDecimal.ONE);
    }
}
