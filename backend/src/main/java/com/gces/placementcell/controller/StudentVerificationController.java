package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.SaveDraftRequest;
import com.gces.placementcell.dto.request.SubmitDraftRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.DraftResponse;
import com.gces.placementcell.dto.response.VerificationFileResponse;
import com.gces.placementcell.dto.response.VersionDetail;
import com.gces.placementcell.dto.response.VersionSummary;
import com.gces.placementcell.service.ProfileVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * The student's profile draft and verification requests. SecurityConfig restricts /student/** to
 * STUDENT; every call works on the caller's own profile only.
 */
@RestController
@RequestMapping("/student")
@RequiredArgsConstructor
public class StudentVerificationController {

    private final ProfileVerificationService verificationService;

    @GetMapping("/profile/draft")
    public ResponseEntity<ApiResponse<DraftResponse>> getDraft(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(verificationService.getDraft(user.getUsername())));
    }

    @PutMapping("/profile/draft")
    public ResponseEntity<ApiResponse<DraftResponse>> saveDraft(@AuthenticationPrincipal UserDetails user,
                                                                @Valid @RequestBody SaveDraftRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Draft saved", verificationService.saveDraft(user.getUsername(), request)));
    }

    @DeleteMapping("/profile/draft")
    public ResponseEntity<ApiResponse<Void>> discardDraft(@AuthenticationPrincipal UserDetails user) {
        verificationService.discardDraft(user.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Draft discarded", null));
    }

    @PostMapping("/profile/draft/submit")
    public ResponseEntity<ApiResponse<DraftResponse>> submit(@AuthenticationPrincipal UserDetails user,
                                                             @Valid @RequestBody(required = false) SubmitDraftRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Submitted for verification",
                verificationService.submit(user.getUsername(), request == null ? null : request.studentNote())));
    }

    @PostMapping("/profile/draft/withdraw")
    public ResponseEntity<ApiResponse<DraftResponse>> withdraw(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.success("Request withdrawn", verificationService.withdraw(user.getUsername())));
    }

    @GetMapping("/verifications")
    public ResponseEntity<ApiResponse<List<VersionSummary>>> myVersions(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(verificationService.myVersions(user.getUsername())));
    }

    @GetMapping("/verifications/{id}")
    public ResponseEntity<ApiResponse<VersionDetail>> myVersion(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(verificationService.myVersion(user.getUsername(), id)));
    }

    @PostMapping(value = "/verification/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VerificationFileResponse>> upload(@AuthenticationPrincipal UserDetails user,
                                                                        @RequestParam("file") MultipartFile file,
                                                                        @RequestParam(value = "section", required = false) String section) {
        return ResponseEntity.ok(ApiResponse.success("File uploaded",
                verificationService.uploadFile(user.getUsername(), file, section)));
    }
}
