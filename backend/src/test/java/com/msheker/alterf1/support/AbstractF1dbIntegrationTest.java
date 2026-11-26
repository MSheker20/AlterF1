package com.msheker.alterf1.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
public abstract class AbstractF1dbIntegrationTest {

	@DynamicPropertySource
	static void registerDatasourceProperties(DynamicPropertyRegistry registry) {
		var postgres = F1dbPostgres.get();
		registry.add("spring.datasource.url", postgres::getJdbcUrl);
		registry.add("spring.datasource.username", () -> F1dbPostgres.RO_USER);
		registry.add("spring.datasource.password", () -> F1dbPostgres.RO_PASSWORD);
		registry.add("spring.flyway.user", () -> F1dbPostgres.OWNER_USER);
		registry.add("spring.flyway.password", () -> F1dbPostgres.OWNER_PASSWORD);
	}

}
