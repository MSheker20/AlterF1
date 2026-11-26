package com.msheker.alterf1.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps API errors to RFC 9457 problem details: 400 for bad input, 404 for missing seasons. */
@RestControllerAdvice
public class ApiExceptions {

    @ExceptionHandler(BadRequestException.class)
    ProblemDetail badRequest(BadRequestException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        problem.setTitle("Bad request");
        return problem;
    }

    @ExceptionHandler(SeasonNotFoundException.class)
    ProblemDetail notFound(SeasonNotFoundException e) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        problem.setTitle("Season not found");
        return problem;
    }
}

class BadRequestException extends RuntimeException {
    BadRequestException(String message) {
        super(message);
    }
}

class SeasonNotFoundException extends RuntimeException {
    SeasonNotFoundException(int year) {
        super("No championship data for " + year + ".");
    }
}
