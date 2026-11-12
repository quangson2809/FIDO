package com.fido.modules.order.dto.request;

import com.fido.modules.order.service.OrderAction;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target({
    ElementType.FIELD,
    ElementType.PARAMETER,
    ElementType.METHOD,
    ElementType.RECORD_COMPONENT
})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = ValidOrderAction.Validator.class)
public @interface ValidOrderAction {
    String message() default "must be a supported order action";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    final class Validator implements ConstraintValidator<ValidOrderAction, String> {
        @Override
        public boolean isValid(String value, ConstraintValidatorContext context) {
            return value == null || OrderAction.fromWire(value) != null;
        }
    }
}
