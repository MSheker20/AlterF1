package com.msheker.alterf1.data;

import java.math.BigDecimal;

/**
 * One line of a season's real final constructors' standings (1958+).
 * Row of {@code alterf1.season_constructor_standings}.
 *
 * @param position     championship position, or {@code null} when not classified (e.g. EX, DSQ)
 * @param positionText raw F1DB text: "1", "2", ... or "EX", "DSQ"
 */
public record RealConstructorStanding(
        Integer position,
        String positionText,
        String constructorId,
        String constructorName,
        String engineManufacturerId,
        String engineManufacturerName,
        BigDecimal points,
        boolean championshipWon) {

    /** Team key: chassis + engine manufacturer (e.g. {@code "cooper:climax"}). */
    public String teamId() {
        return constructorId + ":" + engineManufacturerId;
    }

    /** Display name matching F1DB constructor standings (e.g. "Cooper Climax", "Ferrari"). */
    public String teamName() {
        if (constructorId.equals(engineManufacturerId) || constructorName.equals(engineManufacturerName)) {
            return constructorName;
        }
        return constructorName + " " + engineManufacturerName;
    }
}
