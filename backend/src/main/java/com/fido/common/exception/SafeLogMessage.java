package com.fido.common.exception;

/**
 * Marks a server-authored diagnostic summary that is safe for operational logs.
 *
 * <p>Implementations must not include request payloads, credentials, provider response
 * bodies, or raw exception messages.</p>
 */
public interface SafeLogMessage {

    String logMessage();
}
