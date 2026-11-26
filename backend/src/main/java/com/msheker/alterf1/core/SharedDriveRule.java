package com.msheker.alterf1.core;

/** What happens to the points of a car driven by more than one driver in a race. */
public enum SharedDriveRule {
    /** 1950-57: the position's points are split equally between the drivers. */
    SPLIT,
    /** 1958 onwards: shared drives score nothing. */
    NO_POINTS
}
