package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.ApproveVersionRequest;
import com.gces.placementcell.dto.request.RejectVersionRequest;
import com.gces.placementcell.dto.response.*;
import com.gces.placementcell.service.ProfileVerificationService;
import com.gces.placementcell.service.StudentScope;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** Fallback profile verification for any department. ADMIN only. */
@RestController
@RequestMapping("/admin/verifications")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminVerificationController {

    private final ProfileVerificationService verificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<VersionSummary>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String departmentCode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                verificationService.list(StudentScope.forAdmin(), status, search, departmentCode, page, size)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<VerificationCounts>> summary() {
        return ResponseEntity.ok(ApiResponse.success(verificationService.counts(StudentScope.forAdmin())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VersionDetail>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(verificationService.reviewDetail(StudentScope.forAdmin(), id)));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<VersionDetail>> approve(@PathVariable Long id,
                                                              @Valid @RequestBody(required = false) ApproveVersionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile changes approved",
                verificationService.approve(StudentScope.forAdmin(), id, request == null ? null : request.comment())));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<VersionDetail>> reject(@PathVariable Long id, @Valid @RequestBody RejectVersionRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Profile changes rejected",
                verificationService.reject(StudentScope.forAdmin(), id, request)));
    }
}
