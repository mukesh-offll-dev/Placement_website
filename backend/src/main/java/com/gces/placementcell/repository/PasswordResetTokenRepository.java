package com.gces.placementcell.repository;

import com.gces.placementcell.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Links requested for this user since {@code since}, used or not (the hourly throttle). */
    long countByUserIdAndCreatedAtAfter(Long userId, LocalDateTime since);

    /** Links of this user that have not been used or retired yet. */
    List<PasswordResetToken> findByUserIdAndUsedAtIsNull(Long userId);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") LocalDateTime cutoff);
}
