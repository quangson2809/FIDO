package com.fido.common.exception;

/** A server-authored diagnostic summary that is safe to include in operational logs. */
public interface SafeLogMessage {
    String logMessage();
}
