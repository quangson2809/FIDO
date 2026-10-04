package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.net.SocketTimeoutException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

class ImgBbImageStorageClientTests {

    @Test
    void validResponseReturnsOnlyCatalogFacingImageData() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ImgBbImageStorageClient storage = new ImgBbImageStorageClient(
                builder.baseUrl("https://api.imgbb.com").build(),
                "server-secret"
        );

        server.expect(requestTo(
                        "https://api.imgbb.com/1/upload?key=server-secret"
                ))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(
                        """
                        {
                          "data": {
                            "id": "provider-id",
                            "url": "https://i.ibb.co/example/front.png",
                            "delete_url": "https://ibb.co/delete/provider-token"
                          },
                          "success": true,
                          "status": 200
                        }
                        """,
                        MediaType.APPLICATION_JSON
                ));

        ImageStorageGateway.UploadedImage uploaded = storage.upload(image("front.png"));

        assertEquals("https://i.ibb.co/example/front.png", uploaded.url());
        server.verify();
    }

    @Test
    void providerBadRequestMapsToBadGatewayWithoutLeakingSecret() {
        assertProviderErrorMapped(HttpStatus.BAD_REQUEST);
    }

    @Test
    void invalidProviderKeyMapsToBadGatewayWithoutLeakingSecret() {
        assertProviderErrorMapped(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void timeoutMapsToGatewayTimeout() {
        RestClient restClient = RestClient.builder()
                .baseUrl("https://api.imgbb.com")
                .requestFactory((uri, method) -> {
                    throw new SocketTimeoutException("simulated timeout");
                })
                .build();

        ImgBbImageStorageClient storage = new ImgBbImageStorageClient(
                restClient,
                "server-secret"
        );

        ProductImageStorageException error = assertThrows(
                ProductImageStorageException.class,
                () -> storage.upload(image("front.png"))
        );

        assertEquals(HttpStatus.GATEWAY_TIMEOUT, error.getStatusCode());
        assertFalse(error.getReason().contains("server-secret"));
    }

    @Test
    void malformedProviderResponseMapsToBadGateway() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ImgBbImageStorageClient storage = new ImgBbImageStorageClient(
                builder.baseUrl("https://api.imgbb.com").build(),
                "server-secret"
        );

        server.expect(requestTo(
                        "https://api.imgbb.com/1/upload?key=server-secret"
                ))
                .andRespond(withSuccess(
                        "{not-valid-json",
                        MediaType.APPLICATION_JSON
                ));

        ProductImageStorageException error = assertThrows(
                ProductImageStorageException.class,
                () -> storage.upload(image("front.png"))
        );

        assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
        assertFalse(error.getReason().contains("server-secret"));
        server.verify();
    }

    private void assertProviderErrorMapped(HttpStatus providerStatus) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ImgBbImageStorageClient storage = new ImgBbImageStorageClient(
                builder.baseUrl("https://api.imgbb.com").build(),
                "server-secret"
        );

        server.expect(requestTo(
                        "https://api.imgbb.com/1/upload?key=server-secret"
                ))
                .andRespond(withStatus(providerStatus));

        ProductImageStorageException error = assertThrows(
                ProductImageStorageException.class,
                () -> storage.upload(image("front.png"))
        );

        assertEquals(HttpStatus.BAD_GATEWAY, error.getStatusCode());
        assertFalse(error.getReason().contains("server-secret"));
        assertFalse(error.getReason().contains("api.imgbb.com"));
        server.verify();
    }

    private MultipartFile image(String filename) {
        return new MockMultipartFile(
                "images",
                filename,
                MediaType.IMAGE_PNG_VALUE,
                new byte[]{1, 2, 3}
        );
    }
}
