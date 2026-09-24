package com.stockpulse.config;

import com.stockpulse.user.Role;
import com.stockpulse.user.User;
import com.stockpulse.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Creates the admin account on startup using env-configured credentials.
 * BCrypt hash is computed at runtime so no plaintext secret ends up in SQL.
 */
@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder, AppProperties props) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
    }

    @Override
    public void run(String... args) {
        String email = props.admin().email().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            log.info("Admin user already exists: {}", email);
            return;
        }
        User admin = new User();
        admin.setName("Admin");
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(props.admin().password()));
        admin.setRole(Role.ADMIN);
        userRepository.save(admin);
        log.info("Admin user created: {}", email);
    }
}
