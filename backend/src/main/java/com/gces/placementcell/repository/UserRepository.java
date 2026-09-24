package com.gces.placementcell.repository;

import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.AccountStatus;
import com.gces.placementcell.entity.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA Repository for User entity.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailAndIsDeletedFalse(String email);

    Optional<User> findByIdAndIsDeletedFalse(Long id);

    boolean existsByEmail(String email);

    boolean existsByEmailAndIsDeletedFalse(String email);

    List<User> findByRole(UserRole role);

    List<User> findByRoleAndIsDeletedFalse(UserRole role);

    List<User> findByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole role);

    List<User> findByAccountStatus(AccountStatus accountStatus);

    List<User> findByAccountStatusAndIsDeletedFalse(AccountStatus accountStatus);

    List<User> findByIsDeletedFalse();

    @Modifying
    @Query("UPDATE User u SET u.lastLoginAt = :loginTime WHERE u.id = :userId")
    void updateLastLoginAt(@Param("userId") Long userId, @Param("loginTime") LocalDateTime loginTime);

    @Modifying
    @Query("UPDATE User u SET u.isDeleted = true, u.isActive = false WHERE u.id = :userId")
    void softDeleteById(@Param("userId") Long userId);
}
