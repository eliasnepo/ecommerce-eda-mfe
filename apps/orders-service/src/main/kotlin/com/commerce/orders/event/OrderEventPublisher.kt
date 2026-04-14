package com.commerce.orders.event

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component

@Component
class OrderEventPublisher(
    private val kafkaTemplate: KafkaTemplate<Any, Any>,
    @Value("\${orders.kafka.topic}") private val topic: String
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun publish(event: OrderCreatedEvent) {
        val key = event.orderId.toString()
        kafkaTemplate.send(topic, key, event).whenComplete { result, error ->
            if (error != null) {
                log.error("Failed to publish OrderCreatedEvent {}", event.eventId, error)
            } else if (result != null) {
                log.debug(
                    "Published OrderCreatedEvent {} to {}-{}@{}",
                    event.eventId,
                    result.recordMetadata.topic(),
                    result.recordMetadata.partition(),
                    result.recordMetadata.offset()
                )
            }
        }
    }
}
