package com.fido.modules.product.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImgBbImageStorageClient implements ImageStorageGateway {

    private static final Logger log = LoggerFactory.getLogger(ImgBbImageStorageClient.class);

    private final RestClient restClient;
    private final String apiKey;

    @Autowired
    public ImgBbImageStorageClient(
            @Value("${app.image-storage.imgbb.base-url:https://api.imgbb.com}") String baseUrl,
            @Value("${app.image-storage.imgbb.api-key:}") String apiKey,
            @Value("${app.image-storage.imgbb.connect-timeout:5s}") Duration connectTimeout,
            @Value("${app.image-storage.imgbb.read-timeout:20s}") Duration readTimeout
    ) {
        this(createClient(baseUrl, connectTimeout, readTimeout), apiKey);
    }

    ImgBbImageStorageClient(RestClient restClient, String apiKey) {
        this.restClient = restClient;
        this.apiKey = apiKey;
    }

    @Override
    public UploadedImage upload(MultipartFile image) {
        requireConfigured();
        long startedAt = System.nanoTime();

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", image.getResource());

        try {
            ImgBbUploadResponse response = restClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/1/upload")
                            .queryParam("key", apiKey)
                            .build())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(ImgBbUploadResponse.class);

            if (response == null
                    || !Boolean.TRUE.equals(response.success())
                    || response.data() == null
                    || !ProductImageUrlPolicy.isValid(response.data().url())) {
                logProviderResult("invalid_response", startedAt);
                throw integrationFailure(
                        HttpStatus.BAD_GATEWAY,
                        "Image storage returned an invalid upload response"
                );
            }

            logProviderResult("success", startedAt);
            return new UploadedImage(response.data().url());
        } catch (ProductImageStorageException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            log.warn(
                    "Image storage request completed result=http_error providerStatus={} durationMs={}",
                    exception.getStatusCode().value(),
                    elapsedMillis(startedAt)
            );
            throw integrationFailure(
                    HttpStatus.BAD_GATEWAY,
                    "Image storage rejected the upload with HTTP "
                            + exception.getStatusCode().value()
            );
        } catch (ResourceAccessException exception) {
            if (causedByTimeout(exception)) {
                logProviderResult("timeout", startedAt);
                throw integrationFailure(
                        HttpStatus.GATEWAY_TIMEOUT,
                        "Image storage request timed out"
                );
            }

            logProviderResult("unavailable", startedAt);
            throw integrationFailure(
                    HttpStatus.BAD_GATEWAY,
                    "Image storage is unavailable"
            );
        } catch (RestClientException exception) {
            logProviderResult("client_error", startedAt);
            throw integrationFailure(
                    HttpStatus.BAD_GATEWAY,
                    "Image storage request failed"
            );
        }
    }

    private static RestClient createClient(
            String baseUrl,
            Duration connectTimeout,
            Duration readTimeout
    ) {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    private void requireConfigured() {
        if (apiKey == null || apiKey.isBlank()) {
            throw integrationFailure(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Image storage is not configured"
            );
        }
    }

    private boolean causedByTimeout(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof SocketTimeoutException
                    || current instanceof HttpTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private void logProviderResult(String result, long startedAt) {
        if ("success".equals(result)) {
            log.info(
                    "Image storage request completed result={} durationMs={}",
                    result,
                    elapsedMillis(startedAt)
            );
            return;
        }

        log.warn(
                "Image storage request completed result={} durationMs={}",
                result,
                elapsedMillis(startedAt)
        );
    }

    private long elapsedMillis(long startedAt) {
        return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
    }

    private ProductImageStorageException integrationFailure(
            HttpStatus status,
            String reason
    ) {
        return new ProductImageStorageException(status, reason);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ImgBbUploadResponse(
            ImgBbUploadData data,
            Boolean success
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record ImgBbUploadData(
            String url
    ) {
    }
}
