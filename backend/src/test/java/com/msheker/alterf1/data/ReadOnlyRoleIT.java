package com.msheker.alterf1.data;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

import javax.sql.DataSource;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.simple.JdbcClient;

import com.msheker.alterf1.support.AbstractF1dbIntegrationTest;

/**
 * The application connects as alterf1_ro, which can read but never write. Two independent
 * layers guarantee that: the role's transactions are read-only by default, and it has no
 * write privileges even when a session explicitly switches to read-write.
 */
class ReadOnlyRoleIT extends AbstractF1dbIntegrationTest {

    @Autowired
    JdbcClient jdbc;

    @Autowired
    DataSource dataSource;

    @Test
    void connectsAsReadOnlyRoleWithReadOnlyTransactions() {
        assertThat(jdbc.sql("SELECT current_user").query(String.class).single()).isEqualTo("alterf1_ro");
        assertThat(jdbc.sql("SHOW default_transaction_read_only").query(String.class).single()).isEqualTo("on");
    }

    @ParameterizedTest
    @ValueSource(strings = {"DELETE FROM f1db.race_data", "CREATE TABLE alterf1.sneaky (id int)"})
    void readOnlyTransactionRejectsWrites(String sql) {
        assertThatThrownBy(() -> jdbc.sql(sql).update())
                .isInstanceOf(DataAccessException.class)
                .rootCause().hasMessageContaining("read-only transaction");
    }

    @ParameterizedTest
    @ValueSource(strings = {"DELETE FROM f1db.race_data", "CREATE TABLE alterf1.sneaky (id int)"})
    void privilegesRejectWritesEvenInReadWriteSession(String sql) throws SQLException {
        try (Connection connection = dataSource.getConnection();
                Statement statement = connection.createStatement()) {
            statement.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ WRITE");
            try {
                assertThatThrownBy(() -> statement.execute(sql))
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("permission denied");
            } finally {
                // The connection goes back to the pool: restore the role's read-only default.
                statement.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
            }
        }
    }
}
