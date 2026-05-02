package com.commerce.recommendations.repository;

import com.commerce.recommendations.domain.UserOrder;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserOrderRepository extends JpaRepository<UserOrder, UUID> {

    Optional<UserOrder> findByEventId(UUID eventId);

    @EntityGraph(attributePaths = "items")
    List<UserOrder> findAllByUserIdOrderByOrderedAtDesc(Long userId, Pageable pageable);

    long countByUserId(Long userId);
}
