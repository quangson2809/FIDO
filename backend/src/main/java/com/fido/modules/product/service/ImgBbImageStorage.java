package com.fido.modules.product.service;

import java.net.SocketTimeoutException;
import java.net.http.HttpTimeoutException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ImgBbImageStorage implements ProductImageStorage {

    private final RestClient restClient;
    private final String apiKey;

    @Autowired
    public ImgBbImageStorage(
            @Value("${app.image-storage.imgbb.base-url:https://api.imgbb.com}") String baseUrl,
            @Value("${app.image-storage.imgbb.api-key:}") String apiKey
    ) {
        this(
                RestClient.builder()
                        .baseUrl(baseUrl)
                        .build(),
                apiKey
        );
    }

    ImgBbImageStorage(
            RestClient restClient,
            String apiKey
    ) {
        this.restClient = restClient;
        this.apiKey = apiKey;
    }

    @Override
    public String upload(MultipartFile image) {
        requireConfigured();

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
                    || response.data().url() == null
                    || response.data().url().isBlank()) {
                throw integrationFailure(
                        HttpStatus.BAD_GATEWAY,
                        "Image storage returned an invalid upload response"
                );
            }

            return response.data().url();
        } catch (ProductImageStorageException exception) {
            throw exception;
        } catch (RestClientResponseException exception) {
            throw integrationFailure(
                    HttpStatus.BAD_GATEWAY,
                    "Image storage rejected the upload with HTTP "
                            + exception.getStatusCode().value()
            );
        } catch (ResourceAccessException exception) {
            if (causedByTimeout(exception)) {
                throw integrationFailure(
                        HttpStatus.GATEWAY_TIMEOUT,
                        "Image storage request timed out"
                );
            }

            throw integrationFailure(
                    HttpStatus.BAD_GATEWAY,
                    "Image storage is unavailable"
            );
        } catch (RestClientException exception) {
            throw integrationFailure(
                    HttpStatus.BAD_GATEWAY,
                    "Image storage request failed"
            );
        }
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

    private ProductImageStorageException integrationFailure(
            HttpStatus status,
            String reason
    ) {
        return new ProductImageStorageException(status, reason);
    }

    private record ImgBbUploadResponse(
            ImgBbUploadData data,
            Boolean success,
            Integer status
    ) {
    }

    private record ImgBbUploadData(String url) {
    }
}
