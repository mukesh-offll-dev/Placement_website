package com.gces.placementcell.service.impl;

/** Test-only bridge to the package-private CSV escaper. */
public final class AdminStudentServiceImplCsvAccess {

    private AdminStudentServiceImplCsvAccess() {
    }

    public static String escape(String value) {
        return AdminStudentServiceImpl.escapeCsv(value);
    }
}
