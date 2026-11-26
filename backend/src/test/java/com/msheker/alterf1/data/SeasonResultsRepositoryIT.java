package com.msheker.alterf1.data;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.msheker.alterf1.data.SessionResult.Session;
import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/** Reads real seasons from the pinned F1DB release, as the read-only app role. */
class SeasonResultsRepositoryIT extends AbstractF1dbIntegrationTest {

    @Autowired
    SeasonResultsRepository repository;

    @Test
    void reads1988SeasonWithSixteenGrandsPrixAndNoSprints() {
        List<SessionResult> results = repository.findBySeason(1988);

        assertThat(results).extracting(SessionResult::round).containsOnly(rangeClosed(1, 16));
        assertThat(results).extracting(SessionResult::session).containsOnly(Session.RACE);

        // Round 1, Brazil: Prost won in a McLaren.
        SessionResult winner = results.stream()
                .filter(r -> r.round() == 1 && Integer.valueOf(1).equals(r.position()))
                .findFirst().orElseThrow();
        assertThat(winner.driverId()).isEqualTo("alain-prost");
        assertThat(winner.constructorId()).isEqualTo("mclaren");
    }

    @Test
    void reads2021SeasonWithSprintsInRoundOrder() {
        List<SessionResult> results = repository.findBySeason(2021);

        assertThat(results).extracting(SessionResult::round).containsOnly(rangeClosed(1, 22));
        assertThat(results).filteredOn(r -> r.session() == Session.SPRINT)
                .extracting(SessionResult::round).containsOnly(10, 14, 19);
        assertThat(results).extracting(SessionResult::round).isSorted();
        assertThat(results).anySatisfy(r -> assertThat(r.fastestLap()).isTrue());

        // Within a sprint weekend the sprint comes first, as it was run first.
        assertThat(results).filteredOn(r -> r.round() == 10)
                .extracting(SessionResult::session)
                .startsWith(Session.SPRINT)
                .endsWith(Session.RACE);
    }

    @Test
    void marksIndy500AndSharedDrivesInTheFifties() {
        List<SessionResult> results = repository.findBySeason(1951);

        assertThat(results).filteredOn(SessionResult::indy500)
                .extracting(SessionResult::round).containsOnly(2);
        assertThat(results).anySatisfy(r -> assertThat(r.sharedCar()).isTrue());
    }

    @Test
    void returnsEmptyListForUnknownSeason() {
        assertThat(repository.findBySeason(1949)).isEmpty();
    }

    @Test
    void findsRealChampions() {
        assertThat(repository.findChampion(1988)).get()
                .extracting(SeasonChampion::driverId).isEqualTo("ayrton-senna");
        assertThat(repository.findChampion(2021)).get()
                .extracting(SeasonChampion::driverId).isEqualTo("max-verstappen");
        assertThat(repository.findChampion(1949)).isEmpty();
    }

    private static Integer[] rangeClosed(int from, int to) {
        return IntStream.rangeClosed(from, to).boxed().toArray(Integer[]::new);
    }
}
