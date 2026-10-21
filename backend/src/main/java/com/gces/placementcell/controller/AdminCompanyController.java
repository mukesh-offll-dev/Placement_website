package com.gces.placementcell.controller;

import com.gces.placementcell.dto.request.CompanyRequest;
import com.gces.placementcell.dto.response.ApiResponse;
import com.gces.placementcell.dto.response.CompanyResponse;
import com.gces.placementcell.entity.Company;
import com.gces.placementcell.exception.DuplicateResourceException;
import com.gces.placementcell.repository.CompanyRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Companies for the admin job form.
 *
 * JobRequest.companyId is required, so posting a drive is impossible without a
 * way to list the companies to choose from. Read-only: companies are created
 * with the seed data, and editing them is not part of this screen.
 *
 * Lives under /admin, which SecurityConfig restricts to ADMIN and
 * PLACEMENT_OFFICER.
 */
@RestController
@RequestMapping("/admin")
public class AdminCompanyController {

    private final CompanyRepository companyRepository;

    public AdminCompanyController(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @GetMapping("/companies")
    public ResponseEntity<ApiResponse<List<CompanyResponse>>> listCompanies() {
        List<CompanyResponse> companies = companyRepository.findAll(Sort.by("name")).stream()
                .map(CompanyResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(companies));
    }

    /**
     * Creates a company so a drive can be posted for a recruiter that is not on
     * file yet. Without this the job form is unusable on a fresh database: the
     * company is required and there would be no way to add one.
     *
     * The name is unique, case-insensitively, so repeated submissions do not
     * leave "Google" and "google" as two separate recruiters.
     */
    @PostMapping("/companies")
    public ResponseEntity<ApiResponse<CompanyResponse>> createCompany(
            @Valid @RequestBody CompanyRequest request) {

        String name = request.name().trim();
        if (companyRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new DuplicateResourceException("A company named '" + name + "' already exists");
        }

        Company saved = companyRepository.save(Company.builder()
                .name(name)
                .industry(blankToNull(request.industry()))
                .website(blankToNull(request.website()))
                .build());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Company added", CompanyResponse.from(saved)));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
