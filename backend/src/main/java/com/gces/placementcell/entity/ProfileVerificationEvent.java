package com.gces.placementcell.entity;

import com.gces.placementcell.entity.enums.VerificationAction;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Append-only history of a profile version. Maps to table 'profile_verification_events'. */
@Entity
@Table(
    name = "profile_verification_events",
    indexes = {
        @Index(name = "idx_verification_events_version", columnList = "version_id"),
        @Index(name = "idx_verification_events_created", columnList = "created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(exclude = {"version", "actor"})
@EqualsAndHashCode(of = "id")
public class ProfileVerificationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "version_id", nullable = false, foreignKey = @ForeignKey(name = "fk_verification_events_version"))
    private StudentProfileVersion version;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 20)
    private VerificationAction action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id", foreignKey = @ForeignKey(name = "fk_verification_events_actor"))
    private User actor;

    @Column(name = "actor_role", length = 30)
    private String actorRole;

    @Column(name = "comment", length = 2000)
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
