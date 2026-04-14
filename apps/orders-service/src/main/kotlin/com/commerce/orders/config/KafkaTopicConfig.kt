package com.commerce.orders.config

import org.apache.kafka.clients.admin.NewTopic
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.TopicBuilder

@Configuration
class KafkaTopicConfig(
    @Value("\${orders.kafka.topic}") private val topic: String,
    @Value("\${orders.kafka.partitions}") private val partitions: Int,
    @Value("\${orders.kafka.replication-factor}") private val replicationFactor: Short
) {
    @Bean
    fun orderCreatedTopic(): NewTopic = TopicBuilder.name(topic)
        .partitions(partitions)
        .replicas(replicationFactor.toInt())
        .build()
}
