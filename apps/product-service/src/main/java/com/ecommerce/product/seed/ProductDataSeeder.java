package com.ecommerce.product.seed;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.service.ProductService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
@Profile("local")
public class ProductDataSeeder implements ApplicationRunner {

    private final ProductService productService;
    private final ProductRepository productRepository;

    private static final int TARGET_COUNT = 100;

    public ProductDataSeeder(ProductService productService, ProductRepository productRepository) {
        this.productService = productService;
        this.productRepository = productRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        long existing = productRepository.count();
        if (existing >= TARGET_COUNT) {
            return;
        }

        List<Product> products = generateProducts(TARGET_COUNT - (int) existing);
        products.forEach(productService::save);
    }

    private List<Product> generateProducts(int count) {
        record Template(String category, String[] names, String descTemplate) {}

        List<Template> templates = List.of(
            new Template("Electronics",
                new String[]{"Wireless Headphones", "Bluetooth Speaker", "Smart Watch",
                             "USB-C Hub", "Mechanical Keyboard", "Gaming Mouse",
                             "4K Monitor", "Webcam 1080p", "LED Desk Lamp"},
                "High-quality %s for everyday use."),
            new Template("Clothing",
                new String[]{"Classic T-Shirt", "Slim Fit Jeans", "Running Shorts",
                             "Hooded Sweatshirt", "Wool Beanie", "Leather Belt",
                             "Cotton Socks", "Rain Jacket", "Yoga Pants"},
                "Comfortable and stylish %s for any occasion."),
            new Template("Books",
                new String[]{"Clean Code", "Designing Data-Intensive Applications",
                             "The Pragmatic Programmer", "Domain-Driven Design",
                             "Refactoring", "You Don't Know JS", "System Design Interview"},
                "A must-read: %s for software engineers."),
            new Template("Home & Kitchen",
                new String[]{"French Press Coffee Maker", "Cast Iron Skillet",
                             "Bamboo Cutting Board", "Stainless Steel Kettle",
                             "Digital Kitchen Scale", "Air Fryer", "Blender"},
                "Premium %s for the modern kitchen."),
            new Template("Sports",
                new String[]{"Yoga Mat", "Resistance Bands Set", "Jump Rope",
                             "Foam Roller", "Water Bottle 1L", "Running Belt",
                             "Gym Gloves"},
                "Level up your workout with this %s.")
        );

        Random random = new Random(42);
        List<Product> products = new ArrayList<>();
        int produced = 0;

        outer:
        for (int round = 0; ; round++) {
            for (Template tpl : templates) {
                for (String name : tpl.names()) {
                    if (produced >= count) break outer;
                    Product p = new Product();
                    String variant = round > 0 ? name + " v" + (round + 1) : name;
                    p.setName(variant);
                    p.setDescription(String.format(tpl.descTemplate(), variant));
                    p.setCategory(tpl.category());
                    p.setPrice(BigDecimal.valueOf(5 + random.nextDouble() * 495)
                                        .setScale(2, RoundingMode.HALF_UP));
                    p.setImageUrl("https://placehold.co/400x300?text=" +
                                  URLEncoder.encode(variant, StandardCharsets.UTF_8));
                    products.add(p);
                    produced++;
                }
            }
        }

        return products;
    }
}
