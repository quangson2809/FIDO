package com.fido.modules.account.service;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Normalizes the P1.2 Vietnamese phone identity before lookup, uniqueness checks, and writes. */
@Service
public class PhoneNumberCanonicalizer {
    private static final Pattern NATIONAL = Pattern.compile("0([0-9]{9})");
    private static final Pattern INTERNATIONAL = Pattern.compile("\\+84([0-9]{9})");

    public String canonicalize(String input) {
        if (input == null) {
            throw invalidPhone();
        }

        String normalized = input.trim().replace("-", "").replace("(", "").replace(")", "");

        Matcher national = NATIONAL.matcher(normalized);
        if (national.matches()) {
            return "+84" + national.group(1);
        }

        Matcher international = INTERNATIONAL.matcher(normalized);
        if (international.matches()) {
            return normalized;
        }

        throw invalidPhone();
    }

    /**
     * Includes the old national representation for safe lookup during migration from legacy rows.
     * New writes must always store the first (canonical) value.
     */
    public List<String> lookupValues(String canonicalPhone) {
        String canonical = canonicalize(canonicalPhone);
        return List.of(canonical, "0" + canonical.substring(3));
    }

    private static ResponseStatusException invalidPhone() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid phone format");
    }
}
