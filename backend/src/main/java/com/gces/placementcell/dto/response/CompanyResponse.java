package com.gces.placementcell.dto.response;

import com.gces.placementcell.entity.Company;

/** A recruiting company, as shown on job cards and placement records. */
public record CompanyResponse(
        Long id,
        String name,
        String shortName,
        String logoUrl,
        String logoColor,
        String about,
        String website,
        String industry
) {

    public static CompanyResponse from(Company company) {
        if (company == null) {
            return null;
        }
        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getShortName(),
                company.getLogoUrl(),
                company.getLogoColor(),
                company.getAbout(),
                company.getWebsite(),
                company.getIndustry()
        );
    }
}
