package com.msheker.alterf1.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Every API error is an RFC 9457 problem detail: 400 for bad input, 404 for missing seasons,
 * Spring MVC's own errors (missing parameter, bad path variable) via the base class, and 500
 * for anything unexpected, without leaking internals. Extending the base class keeps all
 * handlers in one advice, so the most specific handler always wins over the catch-all.
 */
@RestControllerAdvice
public class ApiExceptions extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptions.class);

    @ExceptionHandler(BadRequestException.class)
    ProblemDetail badRequest(BadRequestException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        problem.setTitle("Bad request");
        if (e.field() != null) {
            // The query parameter at fault, so the UI can show the error next to its control.
            problem.setProperty("field", e.field());
        }
        return problem;
    }

    @ExceptionHandler(SeasonNotFoundException.class)
    ProblemDetail notFound(SeasonNotFoundException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        problem.setTitle("Season not found");
        return problem;
    }

    /** True for the client's own mistakes (bad input, unknown season), as opposed to server faults. */
    public static boolean isClientError(Throwable e) {
        return e instanceof BadRequestException || e instanceof SeasonNotFoundException;
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail unexpected(Exception e) {
        log.error("Unexpected API error", e);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred.");
        problem.setTitle("Internal error");
        return problem;
    }
}

class BadRequestException extends RuntimeException {
    private final String field;

    BadRequestException(String message) {
        this(null, message);
    }

    /** @param field the query parameter at fault, e.g. "exclude" or "custom" */
    BadRequestException(String field, String message) {
        super(message);
        this.field = field;
    }

    String field() {
        return field;
    }
}

class SeasonNotFoundException extends RuntimeException {
    SeasonNotFoundException(int year) {
        super("No championship data for " + year + ".");
    }
}
