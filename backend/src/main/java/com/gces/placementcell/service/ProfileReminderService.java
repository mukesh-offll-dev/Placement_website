package com.gces.placementcell.service;

import com.gces.placementcell.entity.StudentProfile;
import com.gces.placementcell.entity.User;
import com.gces.placementcell.entity.enums.NotificationPriority;
import com.gces.placementcell.entity.enums.NotificationType;
import com.gces.placementcell.entity.enums.UserRole;
import com.gces.placementcell.repository.StudentProfileRepository;
import com.gces.placementcell.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Reminds students to finish their profile, in the app and by email.
 *
 * A student is reminded when they have completed first-login setup, their profile is still
 * incomplete, and they have not been reminded within the interval (a week by default), so nobody
 * is emailed every day. Delivery goes through {@link NotificationDispatcher}, which sends after the
 * transaction commits and never fails the caller if mail is down.
 */
@Slf4j
@Service
public class ProfileReminderService {

    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final boolean enabled;
    private final long intervalDays;

    public ProfileReminderService(StudentProfileRepository studentProfileRepository,
                                  UserRepository userRepository,
                                  ApplicationEventPublisher eventPublisher,
                                  @Value("${app.profile-reminder.enabled:true}") boolean enabled,
                                  @Value("${app.profile-reminder.interval-days:7}") long intervalDays) {
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.enabled = enabled;
        this.intervalDays = Math.max(1, intervalDays);
    }

    /** Runs daily; the hour is configurable with app.profile-reminder.cron. */
    @Scheduled(cron = "${app.profile-reminder.cron:0 0 10 * * *}")
    public void sendScheduledReminders() {
        if (!enabled) {
            return;
        }
        try {
            int sent = sendReminders();
            log.info("Profile reminders: {} student(s) reminded", sent);
        } catch (RuntimeException ex) {
            log.error("Profile reminders failed: {}", ex.getMessage(), ex);
        }
    }

    /** Reminds every student who is due one. Returns how many were reminded. */
    @Transactional
    public int sendReminders() {
        Long senderId = userRepository.findByRoleAndIsActiveTrueAndIsDeletedFalse(UserRole.ADMIN).stream()
                .map(User::getId).findFirst().orElse(null);
        if (senderId == null) {
            log.warn("Profile reminders skipped: no active admin account to send them from.");
            return 0;
        }

        LocalDateTime now = LocalDateTime.now();
        List<StudentProfile> due = studentProfileRepository.findNeedingProfileReminder(now.minusDays(intervalDays));
        int reminded = 0;
        for (StudentProfile profile : due) {
            List<String> missing = missingItems(profile);
            if (missing.isEmpty()) {
                continue;
            }
            eventPublisher.publishEvent(new UserNotificationEvent(
                    List.of(profile.getUser().getId()),
                    senderId,
                    "Complete your placement profile",
                    "Your profile is " + profile.getProfileCompletionPercent() + "% complete. Still missing: "
                            + String.join(", ", missing)
                            + ". A complete profile helps you qualify for more placement drives.",
                    NotificationType.GENERAL,
                    NotificationPriority.NORMAL,
                    null,
                    "/student/profile",
                    true));
            profile.setProfileReminderSentAt(now);
            studentProfileRepository.save(profile);
            reminded++;
        }
        return reminded;
    }

    /** The profile details a placement cell needs that this student has not filled in yet. */
    static List<String> missingItems(StudentProfile profile) {
        List<String> missing = new ArrayList<>();
        if (isBlank(profile.getPhone())) missing.add("phone number");
        if (isBlank(profile.getDepartment())) missing.add("department");
        if (isBlank(profile.getBatch())) missing.add("batch");
        if (profile.getCgpa() == null) missing.add("CGPA");
        if (isBlank(profile.getResumeUrl())) missing.add("resume");
        return missing;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
