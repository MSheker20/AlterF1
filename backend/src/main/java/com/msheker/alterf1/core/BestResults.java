package com.msheker.alterf1.core;

/**
 * Which race scores count towards the championship ("dropped scores").
 * A race score is everything a driver earned in one Grand Prix (position + fastest lap).
 */
public sealed interface BestResults {

    /** Every result counts. */
    record All() implements BestResults {
    }

    /** Only the best {@code count} race scores of the season count. */
    record Season(int count) implements BestResults {
        public Season {
            if (count < 1) {
                throw new IllegalArgumentException("count must be >= 1: " + count);
            }
        }
    }

    /**
     * Split season (1967-80): the best {@code firstCount} of the first {@code firstHalfRaces}
     * rounds plus the best {@code secondCount} of the remaining rounds.
     */
    record Halves(int firstHalfRaces, int firstCount, int secondCount) implements BestResults {
        public Halves {
            if (firstHalfRaces < 1 || firstCount < 1 || secondCount < 1) {
                throw new IllegalArgumentException("all values must be >= 1");
            }
        }
    }

    BestResults ALL = new All();
}
