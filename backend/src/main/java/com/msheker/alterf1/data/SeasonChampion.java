package com.msheker.alterf1.data;

import java.math.BigDecimal;

/** The real drivers' champion of a season. Row of {@code alterf1.season_champions}. */
public record SeasonChampion(int year, String driverId, String driverName, BigDecimal points) {
}
