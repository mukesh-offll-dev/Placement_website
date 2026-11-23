package com.gces.placementcell.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an old direct-write endpoint for a verified profile section. When a STUDENT calls it,
 * {@link VerifiedProfileWriteInterceptor} answers 409 before the body is even read: those sections
 * now change only through a draft that a faculty advisor approves. Staff callers are unaffected.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface VerifiedProfileWrite {
}
