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
import java.util.Map;
import java.util.Random;

@Component
@Profile("local")
public class ProductDataSeeder implements ApplicationRunner {

    private final ProductService productService;
    private final ProductRepository productRepository;

    private static final int TARGET_COUNT = 100;
    private static final Map<String, List<String>> REAL_IMAGE_URLS_BY_CATEGORY = Map.of(
            "Electronics", List.of(
                    "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=800&q=80"
            ),
            "Clothing", List.of(
                    "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80"
            ),
            "Books", List.of(
                    "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1513001900722-370f803f498d?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80"
            ),
            "Home & Kitchen", List.of(
                    "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=800&q=80"
            ),
            "Sports", List.of(
                    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
                    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80"
            )
    );

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
                    p.setImageUrl(resolveImageUrl(tpl.category(), variant));
                    products.add(p);
                    produced++;
                }
            }
        }

        return products;
    }

    private String resolveImageUrl(String category, String productName) {
        List<String> candidateUrls = REAL_IMAGE_URLS_BY_CATEGORY.get(category);
        if (candidateUrls == null || candidateUrls.isEmpty()) {
            return buildPlaceholderImageUrl(productName);
        }

        int index = Math.floorMod((category + ":" + productName).hashCode(), candidateUrls.size());
        String selectedUrl = candidateUrls.get(index);
        if (selectedUrl == null || selectedUrl.isBlank()) {
            return buildPlaceholderImageUrl(productName);
        }

        return selectedUrl;
    }

    private String buildPlaceholderImageUrl(String productName) {
        return "https://placehold.co/400x300?text="
                + URLEncoder.encode(productName, StandardCharsets.UTF_8);
    }
}
