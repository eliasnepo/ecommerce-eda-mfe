package com.commerce.orders.integration

import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.serialization.StringDeserializer
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.resttestclient.TestRestTemplate
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.kafka.KafkaContainer
import org.testcontainers.utility.DockerImageName
import java.time.Duration
import java.time.Instant
import java.util.UUID

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@Testcontainers
@ActiveProfiles("test")
class OrderFlowIntegrationTest {

    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("ecommerce")
            .withUsername("ecommerce")
            .withPassword("ecommerce")

        @Container
        @JvmStatic
        val kafka = KafkaContainer(DockerImageName.parse("apache/kafka:3.7.0"))

        @JvmStatic
        @DynamicPropertySource
        fun configureProperties(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
            registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers)
        }
    }

    @Autowired
    private lateinit var restTemplate: TestRestTemplate

    @Autowired
    private lateinit var jdbcTemplate: JdbcTemplate

    @Test
    fun `post order persists rows and publishes order created event`() {
        val firstProductId = UUID.randomUUID()
        val secondProductId = UUID.randomUUID()

        val request = mapOf(
            "userId" to 7,
            "items" to listOf(
                mapOf(
                    "productId" to firstProductId.toString(),
                    "productName" to "Wireless Headphones",
                    "price" to 129.99,
                    "quantity" to 1
                ),
                mapOf(
                    "productId" to secondProductId.toString(),
                    "productName" to "USB-C Cable",
                    "price" to 19.50,
                    "quantity" to 2
                )
            )
        )

        val response: ResponseEntity<Map<*, *>> =
            restTemplate.postForEntity("/api/orders", request, Map::class.java)

        assertEquals(HttpStatus.CREATED, response.statusCode)
        val responseBody = response.body
        assertNotNull(responseBody)

        val orderId = UUID.fromString(responseBody?.get("orderId") as String)
        assertTrue(response.headers.location.toString().endsWith("/api/orders/$orderId"))

        val orderCount = jdbcTemplate.queryForObject(
            "select count(*) from orders.orders where id = ?",
            Int::class.java,
            orderId
        )
        val itemCount = jdbcTemplate.queryForObject(
            "select count(*) from orders.order_items where order_id = ?",
            Int::class.java,
            orderId
        )

        assertEquals(1, orderCount)
        assertEquals(2, itemCount)

        val event = consumeOrderCreatedEvent()
        assertNotNull(event)
        assertTrue(event!!.contains(orderId.toString()))
        assertTrue(event.contains("\"userId\":7"))
    }

    private fun consumeOrderCreatedEvent(): String? {
        val consumerProps = mutableMapOf<String, Any>(
            ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG to kafka.bootstrapServers,
            ConsumerConfig.GROUP_ID_CONFIG to "orders-service-it-${UUID.randomUUID()}",
            ConsumerConfig.AUTO_OFFSET_RESET_CONFIG to "earliest",
            ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java,
            ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG to StringDeserializer::class.java
        )

        KafkaConsumer<String, String>(consumerProps).use { consumer ->
            consumer.subscribe(listOf("order.created"))

            val deadline = Instant.now().plusSeconds(10)
            while (Instant.now().isBefore(deadline)) {
                val records = consumer.poll(Duration.ofMillis(500))
                for (record in records) {
                    return record.value()
                }
            }
        }

        return null
    }
}
