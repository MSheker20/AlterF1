package com.msheker.alterf1.api;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.msheker.alterf1.core.CustomSystem;
import com.msheker.alterf1.core.ScoringOptions;
import com.msheker.alterf1.core.ScoringSystem;

/**
 * The query parameters of the standings endpoint (readable, shareable URLs; PLAN.md §2.2),
 * validated into domain values. Invalid input is a {@link BadRequestException} (400).
 */
public record StandingsQuery(
        String system,
        String preset,
        String exclude,
        String skip,
        String sprint,
        String fastestLap,
        String custom,
        String customFastestLap,
        String customSprint,
        Integer customBest) {

    static final String CUSTOM = "custom";
    private static final int MAX_POINTS = 40;
    private static final BigDecimal MAX_VALUE = new BigDecimal("1000");
    private static final Pattern PLAIN_POINTS = Pattern.compile("\\d{1,4}(\\.\\d{1,2})?");

    boolean isCustom() {
        return CUSTOM.equals(system);
    }

    /** Custom points were given (the compare view then adds a custom column). */
    boolean hasCustomPoints() {
        // Any custom parameter means a custom system was meant: validate it (an orphan
        // customBest without points is a 400, not silently ignored).
        return Stream.of(custom, customFastestLap, customSprint).anyMatch(v -> v != null && !v.isBlank())
                || customBest != null;
    }

    ScoringSystem scoringSystem() {
        try {
            return ScoringSystem.byId(system);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("system", "Unknown scoring system '%s'. Use one of: %s, custom.".formatted(system,
                    Arrays.stream(ScoringSystem.values()).map(ScoringSystem::id).collect(Collectors.joining(", "))));
        }
    }

    Preset presetValue() {
        return Preset.byId(preset);
    }

    ScoringOptions options() {
        ScoringOptions base = presetValue().options();
        return new ScoringOptions(base.halfPoints(), base.doublePoints(), base.includeIndy500(),
                onOff(sprint, "sprint", base.sprints()), onOff(fastestLap, "fl", base.fastestLap()));
    }

    Set<String> excludedDrivers() {
        return csv(exclude).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    Set<Integer> skippedRounds() {
        return csv(skip).map(value -> {
            try {
                return Integer.parseInt(value);
            } catch (NumberFormatException e) {
                throw new BadRequestException("skip", "'skip' takes race rounds, e.g. skip=5,7; got '%s'.".formatted(value));
            }
        }).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    CustomSystem customSystem() {
        if (custom == null || custom.isBlank()) {
            throw new BadRequestException("custom", "A custom system needs its points, e.g. custom=25,18,15,12,10,8,6,4,2,1.");
        }
        // Positions matter: an empty entry ("25,,18") is an error, not silently dropped.
        List<String> values = Arrays.stream(custom.split(",", -1)).map(String::trim).toList();
        if (values.size() > MAX_POINTS) {
            throw new BadRequestException("custom", "A custom system has 1 to %d points values.".formatted(MAX_POINTS));
        }
        List<BigDecimal> points = values.stream().map(StandingsQuery::points).toList();
        CustomSystem.Sprint sprintTable;
        try {
            sprintTable = CustomSystem.Sprint.byId(
                    customSprint == null || customSprint.isBlank() ? "none" : customSprint.trim());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("customSprint", "'customSprint' is one of: none, 321, 8.");
        }
        if (customBest != null && (customBest < 1 || customBest > MAX_POINTS)) {
            throw new BadRequestException("customBest", "'customBest' must be between 1 and %d.".formatted(MAX_POINTS));
        }
        return new CustomSystem(points, onOff(customFastestLap, "customFl", false), sprintTable, customBest);
    }

    private static BigDecimal points(String value) {
        // Plain decimals only. BigDecimal alone would also accept exponents such as "0e-10000000",
        // whose huge scale makes every later addition and the JSON output explode.
        if (!PLAIN_POINTS.matcher(value).matches()) {
            throw new BadRequestException("custom",
                    "Custom points are plain numbers 0 to 1000 with at most 2 decimals; got '%s'.".formatted(value));
        }
        BigDecimal p = new BigDecimal(value);
        if (p.compareTo(MAX_VALUE) > 0) {
            throw new BadRequestException("custom", "Custom points are at most 1000; got '%s'.".formatted(value));
        }
        return p;
    }

    private static boolean onOff(String value, String name, boolean defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return switch (value) {
            case "on" -> true;
            case "off" -> false;
            default -> throw new BadRequestException(name, "'%s' is 'on' or 'off'; got '%s'.".formatted(name, value));
        };
    }

    private static Stream<String> csv(String value) {
        if (value == null || value.isBlank()) {
            return Stream.empty();
        }
        return Arrays.stream(value.split(",")).map(String::trim).filter(s -> !s.isEmpty());
    }
}
