package com.ecommerce.product.controller;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.service.ProductFilter;
import com.ecommerce.product.service.ProductSortBy;
import com.ecommerce.product.service.ProductService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.graphql.GraphQlTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.graphql.test.tester.GraphQlTester;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@GraphQlTest(ProductController.class)
@MockBean(JpaMetamodelMappingContext.class)
class ProductControllerTest {

    @Autowired
    private GraphQlTester graphQlTester;

    @MockBean
    private ProductService productService;

    @Test
    void products_returnsPagedResults() {
        Product p1 = product(UUID.randomUUID(), "Wireless Headphones", "Electronics", new BigDecimal("49.99"));
        Product p2 = product(UUID.randomUUID(), "Bluetooth Speaker", "Electronics", new BigDecimal("29.99"));

        when(productService.search(any(), any()))
                .thenReturn(new PageImpl<>(List.of(p1, p2), PageRequest.of(0, 20), 2));

        graphQlTester.document("""
                {
                  products {
                    content { id name price category }
                    totalElements
                    totalPages
                    currentPage
                  }
                }
                """)
                .execute()
                .path("products.content").entityList(Object.class).hasSize(2)
                .path("products.totalElements").entity(Integer.class).isEqualTo(2)
                .path("products.currentPage").entity(Integer.class).isEqualTo(0);
    }

    @Test
    void products_withFilter_passesFilterToService() {
        Product p = product(UUID.randomUUID(), "Wireless Headphones", "Electronics", new BigDecimal("49.99"));

        when(productService.search(any(), any()))
                .thenReturn(new PageImpl<>(List.of(p), PageRequest.of(0, 20), 1));

        graphQlTester.document("""
                {
                  products(filter: { query: "headphones", category: "Electronics", maxPrice: 100, sortBy: PRICE_ASC }) {
                    content { name }
                    totalElements
                  }
                }
                """)
                .execute()
                .path("products.content[0].name").entity(String.class).isEqualTo("Wireless Headphones")
                .path("products.totalElements").entity(Integer.class).isEqualTo(1);

        ArgumentCaptor<ProductFilter> filterCaptor = ArgumentCaptor.forClass(ProductFilter.class);
        verify(productService).search(filterCaptor.capture(), any());
        assertThat(filterCaptor.getValue()).isNotNull();
        assertThat(filterCaptor.getValue().sortBy()).isEqualTo(ProductSortBy.PRICE_ASC);
    }

    @Test
    void product_returnsProductById() {
        UUID id = UUID.randomUUID();
        Product p = product(id, "Gaming Mouse", "Electronics", new BigDecimal("79.99"));

        when(productService.findById(id)).thenReturn(Optional.of(p));

        graphQlTester.document("""
                query($id: ID!) {
                  product(id: $id) {
                    id name price
                  }
                }
                """)
                .variable("id", id.toString())
                .execute()
                .path("product.name").entity(String.class).isEqualTo("Gaming Mouse")
                .path("product.price").entity(Double.class).isEqualTo(79.99);
    }

    @Test
    void product_returnsNullWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(productService.findById(id)).thenReturn(Optional.empty());

        graphQlTester.document("""
                query($id: ID!) {
                  product(id: $id) {
                    id name
                  }
                }
                """)
                .variable("id", id.toString())
                .execute()
                .path("product").valueIsNull();
    }

    @Test
    void products_usesDefaultPagination() {
        when(productService.search(any(), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        graphQlTester.document("{ products { totalElements currentPage } }")
                .execute()
                .path("products.totalElements").entity(Integer.class).isEqualTo(0)
                .path("products.currentPage").entity(Integer.class).isEqualTo(0);
    }

    private Product product(UUID id, String name, String category, BigDecimal price) {
        Product p = new Product();
        p.setId(id);
        p.setName(name);
        p.setCategory(category);
        p.setPrice(price);
        return p;
    }
}
