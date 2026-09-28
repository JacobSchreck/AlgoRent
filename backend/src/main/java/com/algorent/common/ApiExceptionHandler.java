package com.algorent.common;

import com.algorent.listing.search.InvalidSearchException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Turns errors into RFC 9457 problem-detail JSON. Spring's built-in handling (inherited here)
 * already covers malformed parameters such as a bad date or a non-numeric price with a 400.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(InvalidSearchException.class)
    public ProblemDetail handleInvalidSearch(InvalidSearchException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Invalid search");
        problem.setProperty("errors", ex.getErrors());
        return problem;
    }
}
