package com.msheker.alterf1.api;

import java.util.Arrays;
import java.util.Locale;

import com.msheker.alterf1.core.ScoringOptions;

/** Ready-made option packages for real-life race multipliers (PLAN.md §3). */
public enum Preset {
    HISTORICAL(ScoringOptions.HISTORICAL),
    PURE(ScoringOptions.PURE),
    ALL(ScoringOptions.ALL_MULTIPLIERS);

    private final ScoringOptions options;

    Preset(ScoringOptions options) {
        this.options = options;
    }

    public ScoringOptions options() {
        return options;
    }

    public String id() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Preset byId(String id) {
        return Arrays.stream(values())
                .filter(p -> p.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Unknown preset '%s'. Use one of: historical, pure, all."
                        .formatted(id)));
    }
}
