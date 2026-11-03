package com.gces.placementcell.service;

import com.gces.placementcell.exception.BadRequestException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rules for the identity the placement cell gives a student: the register number.
 *
 * Register numbers are always stored trimmed and uppercase, so the database's UNIQUE constraint
 * on roll_no rejects duplicates whatever case they were typed in. Every lookup goes through
 * {@link #normalize} for the same reason.
 */
public final class StudentIdentity {

    /** Largest number of students one bulk request may create. */
    public static final int MAX_BULK = 100;

    /** Students created by an admin have no email until first login; this stands in for it. */
    public static final String PLACEHOLDER_EMAIL_DOMAIN = "@pending.gces.local";

    private static final Pattern REGISTER_NUMBER = Pattern.compile("^\\d{12}$");
    private static final Pattern TRAILING_DIGITS = Pattern.compile("^(.*?)(\\d+)$");
    /** A student's batch is four years, e.g. graduating 2026 means batch "2022-2026". */
    private static final int COURSE_YEARS = 4;

    private StudentIdentity() {
    }

    /** Trims and uppercases; null stays null so callers can tell "absent" from "blank". */
    public static String normalize(String registerNumber) {
        return registerNumber == null ? null : registerNumber.trim().toUpperCase(Locale.ROOT);
    }

    /** Normalises and validates, throwing a message an admin can act on. */
    public static String requireValid(String registerNumber) {
        String normalized = normalize(registerNumber);
        if (normalized == null || normalized.isEmpty()) {
            throw new BadRequestException("Register number is required");
        }
        if (!REGISTER_NUMBER.matcher(normalized).matches()) {
            throw new BadRequestException("Register number '" + normalized
                    + "' must be exactly 12 digits, for example 830123104032");
        }
        return normalized;
    }

    /**
     * A unique stand-in address for a register number. Characters other than letters and digits are
     * written as "_" plus their hex code, so "ABC-123" and "ABC123" can never share an address.
     */
    public static String placeholderEmail(String registerNumber) {
        StringBuilder local = new StringBuilder();
        for (char c : normalize(registerNumber).toLowerCase(Locale.ROOT).toCharArray()) {
            if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
                local.append(c);
            } else {
                local.append('_').append(Integer.toHexString(c));
            }
        }
        return local + PLACEHOLDER_EMAIL_DOMAIN;
    }

    public static boolean isPlaceholderEmail(String email) {
        return email != null && email.toLowerCase(Locale.ROOT).endsWith(PLACEHOLDER_EMAIL_DOMAIN);
    }

    /** What the API should show for an email: nothing for the stand-in address. */
    public static String visibleEmail(String email) {
        return isPlaceholderEmail(email) ? null : email;
    }

    /**
     * Every register number from {@code from} to {@code to} inclusive. Both must share the same
     * prefix and have a numeric tail of the same length (811521104001 to 811521104060), and the
     * range is capped so one request cannot create an unbounded number of accounts.
     */
    public static List<String> expandRange(String from, String to) {
        String start = requireValid(from);
        String end = requireValid(to);

        Matcher a = TRAILING_DIGITS.matcher(start);
        Matcher b = TRAILING_DIGITS.matcher(end);
        if (!a.matches() || !b.matches()) {
            throw new BadRequestException("Register numbers must end in digits so a range can be generated");
        }
        if (!a.group(1).equals(b.group(1)) || a.group(2).length() != b.group(2).length()) {
            throw new BadRequestException(
                    "Register numbers must match except for the final digits (same prefix and length)");
        }
        // Digits beyond a long cannot be a sensible register number; reject before parsing.
        if (a.group(2).length() > 15) {
            throw new BadRequestException("The numeric part of the register number is too long for a range");
        }

        long first = Long.parseLong(a.group(2));
        long last = Long.parseLong(b.group(2));
        if (first > last) {
            throw new BadRequestException("'From' register number must not be after 'To'");
        }
        if (last - first + 1 > MAX_BULK) {
            throw new BadRequestException("A range can create at most " + MAX_BULK + " students at a time");
        }

        int width = a.group(2).length();
        List<String> numbers = new ArrayList<>((int) (last - first + 1));
        for (long n = first; n <= last; n++) {
            numbers.add(a.group(1) + String.format("%0" + width + "d", n));
        }
        return numbers;
    }

    /** "Batch" as stored on the profile, from the graduation year the admin enters. */
    public static String batchForYear(Integer year) {
        if (year == null) {
            return null;
        }
        return (year - COURSE_YEARS) + "-" + year;
    }

    /** Short code for a department, taken from "Computer Science (CSE)" or derived from known names. */
    public static String departmentCode(String department) {
        if (department == null || department.isBlank()) {
            return null;
        }
        Matcher m = Pattern.compile("\\(([A-Za-z]{2,10})\\)").matcher(department);
        if (m.find()) {
            return m.group(1).toUpperCase(Locale.ROOT);
        }
        String lower = department.trim().toLowerCase(Locale.ROOT);
        if (lower.contains("information technology")) return "IT";
        if (lower.contains("civil")) return "CIVIL";
        if (lower.contains("computer")) return "CSE";
        if (lower.contains("electronics")) return "ECE";
        if (lower.contains("electrical")) return "EEE";
        if (lower.contains("mechanical")) return "MECH";
        StringBuilder initials = new StringBuilder();
        for (String word : department.trim().split("\\s+")) {
            if (!word.isEmpty() && Character.isLetter(word.charAt(0)) && initials.length() < 10) {
                initials.append(Character.toUpperCase(word.charAt(0)));
            }
        }
        return initials.length() == 0 ? null : initials.toString();
    }
}
