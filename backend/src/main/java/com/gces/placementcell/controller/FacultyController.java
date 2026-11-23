package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.ApproveVersionRequest;
import com.gces.placementcell.dto.request.BulkProvisionStudentsRequest;
import com.gces.placementcell.dto.request.BulkStudentActionRequest;
import com.gces.placementcell.dto.request.FacultyBulkProvisionRequest;
import com.gces.placementcell.dto.request.FacultyProvisionStudentRequest;
import com.gces.placementcell.dto.request.ProvisionStudentRequest;
import com.gces.placementcell.dto.request.RejectVersionRequest;
import com.gces.placementcell.dto.request.UpdateStudentRequest;
import com.gces.placementcell.dto.response.*;
import com.gces.placementcell.entity.FacultyProfile;
import com.gces.placementcell.entity.enums.ProfileVerificationStatus;
import com.gces.placementcell.service.AdminStudentService;
import com.gces.placementcell.service.AdminStudentService.StudentListFilter;
import com.gces.placementcell.service.FacultyContext;
import com.gces.placementcell.service.ProfileVerificationService;
import com.gces.placementcell.service.StudentScope;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Faculty advisor endpoints. Every call is scoped to the advisor's own department through a
 * {@link StudentScope} built from the signed-in account (never from request parameters).
 */
@RestController
@RequestMapping("/faculty")
@RequiredArgsConstructor
@PreAuthorize("hasRole('FACULTY_ADVISOR')")
public class FacultyController {

    private final FacultyContext facultyContext;
    private final AdminStudentService studentService;
    private final ProfileVerificationService verificationService;

    // ------------------------------------------------------------------ me + dashboard

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<FacultyDto>> me(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(FacultyDto.from(facultyContext.current(user))));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<FacultyDashboardResponse>> dashboard(@AuthenticationPrincipal UserDetails user) {
        FacultyProfile faculty = facultyContext.current(user);
        if (faculty.getDepartment() == null) {
            throw new AccessDeniedException("No department assigned");
        }
        return ResponseEntity.ok(ApiResponse.success(verificationService.dashboard(faculty)));
    }

    // ------------------------------------------------------------------ students

    @GetMapping("/students")
    public ResponseEntity<ApiResponse<PageResponse<StudentSummaryDto>>> students(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String lifecycle,
            @RequestParam(required = false) ProfileVerificationStatus verificationStatus,
            @RequestParam(required = false) String batch,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        StudentListFilter filter = new StudentListFilter(search, null, null, null, lifecycle, verificationStatus, batch);
        return ResponseEntity.ok(ApiResponse.success(
                studentService.getStudents(filter, page, size, sortBy, sortDir, facultyContext.scope(user))));
    }

    @GetMapping("/students/ids")
    public ResponseEntity<ApiResponse<List<Long>>> studentIds(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String lifecycle,
            @RequestParam(required = false) ProfileVerificationStatus verificationStatus,
            @RequestParam(required = false) String batch) {
        StudentListFilter filter = new StudentListFilter(search, null, null, null, lifecycle, verificationStatus, batch);
        return ResponseEntity.ok(ApiResponse.success(studentService.getStudentIds(filter, facultyContext.scope(user))));
    }

    @GetMapping("/students/{id}")
    public ResponseEntity<ApiResponse<StudentDetailDto>> student(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(studentService.getStudentById(id, facultyContext.scope(user))));
    }

    @PostMapping("/students/provision")
    public ResponseEntity<ApiResponse<StudentSummaryDto>> provision(@AuthenticationPrincipal UserDetails user,
                                                                    @Valid @RequestBody FacultyProvisionStudentRequest request) {
        StudentScope scope = facultyContext.scope(user);
        // Whatever department was sent, the student goes into the advisor's own department.
        StudentSummaryDto created = studentService.provisionStudent(
                new ProvisionStudentRequest(request.registerNumber(), scope.departmentCode(), request.year()), scope);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Student added. Their initial password is their register number.", created));
    }

    @PostMapping("/students/provision/bulk")
    public ResponseEntity<ApiResponse<BulkProvisionResult>> provisionBulk(@AuthenticationPrincipal UserDetails user,
                                                                          @Valid @RequestBody FacultyBulkProvisionRequest request) {
        StudentScope scope = facultyContext.scope(user);
        BulkProvisionResult result = studentService.provisionStudents(new BulkProvisionStudentsRequest(
                request.registerNumberFrom(), request.registerNumberTo(), scope.departmentCode(), request.year()), scope);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(result.created() + " student(s) added, " + result.skipped() + " skipped.", result));
    }

    @PutMapping("/students/{id}")
    public ResponseEntity<ApiResponse<StudentDetailDto>> update(@AuthenticationPrincipal UserDetails user, @PathVariable Long id,
                                                                @Valid @RequestBody UpdateStudentRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Student updated successfully",
                studentService.updateStudent(id, request, facultyContext.scope(user))));
    }

    @PatchMapping("/students/{id}/deactivate")
    public ResponseEntity<ApiResponse<StudentSummaryDto>> deactivate(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Student deactivated",
                studentService.setStudentActive(id, false, facultyContext.scope(user))));
    }

    @PatchMapping("/students/{id}/reactivate")
    public ResponseEntity<ApiResponse<StudentSummaryDto>> reactivate(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Student reactivated",
                studentService.setStudentActive(id, true, facultyContext.scope(user))));
    }

    @PostMapping("/students/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        studentService.resetStudentPassword(id, facultyContext.scope(user));
        return ResponseEntity.ok(ApiResponse.success("Password reset to the register number. The student must change it at next login."));
    }

    @DeleteMapping("/students/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        studentService.deleteStudent(id, facultyContext.scope(user));
        return ResponseEntity.ok(ApiResponse.success("Student deleted"));
    }

    @PostMapping("/students/bulk")
    public ResponseEntity<ApiResponse<BulkActionResult>> bulk(@AuthenticationPrincipal UserDetails user,
                                                              @Valid @RequestBody BulkStudentActionRequest request) {
        return ResponseEntity.ok(ApiResponse.success(studentService.bulkAction(request, facultyContext.scope(user))));
    }

    // ------------------------------------------------------------------ verifications

    @GetMapping("/verifications")
    public ResponseEntity<ApiResponse<PagedResponse<VersionSummary>>> verifications(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                verificationService.list(facultyContext.scope(user), status, search, null, page, size)));
    }

    @GetMapping("/verifications/summary")
    public ResponseEntity<ApiResponse<VerificationCounts>> summary(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(verificationService.counts(facultyContext.scope(user))));
    }

    @GetMapping("/verifications/{id}")
    public ResponseEntity<ApiResponse<VersionDetail>> verification(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(verificationService.reviewDetail(facultyContext.scope(user), id)));
    }

    @PostMapping("/verifications/{id}/approve")
    public ResponseEntity<ApiResponse<VersionDetail>> approve(@AuthenticationPrincipal UserDetails user, @PathVariable Long id,
                                                              @Valid @RequestBody(required = false) ApproveVersionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile changes approved",
                verificationService.approve(facultyContext.scope(user), id, request == null ? null : request.comment())));
    }

    @PostMapping("/verifications/{id}/reject")
    public ResponseEntity<ApiResponse<VersionDetail>> reject(@AuthenticationPrincipal UserDetails user, @PathVariable Long id,
                                                             @Valid @RequestBody RejectVersionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile changes rejected",
                verificationService.reject(facultyContext.scope(user), id, request)));
    }
}
