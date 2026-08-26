plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("maven-publish")
}

android {
    namespace = "com.dashn.sdk"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    kotlinOptions {
        jvmTarget = "21"
    }

    publishing {
        singleVariant("release") {
            withSourcesJar()
            withJavadocJar()
        }
    }
}

// Maven publication — compatible with JitPack and Maven Central
afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("release") {
                from(components["release"])
                groupId = "com.dashn"
                artifactId = "sdk"
                version = project.findProperty("VERSION_NAME") as? String ?: "0.3.1"

                pom {
                    name.set("DTS RIS Android SDK")
                    description.set("Zero-PII analytics auto-capture SDK for Android")
                    url.set("https://github.com/al-dashn/RIS-client")
                    licenses {
                        license {
                            name.set("MIT")
                            url.set("https://opensource.org/licenses/MIT")
                        }
                    }
                    developers {
                        developer {
                            name.set("DTS RIS Team")
                        }
                    }
                    scm {
                        connection.set("scm:git:git://github.com/al-dashn/RIS-client.git")
                        developerConnection.set("scm:git:ssh://github.com/al-dashn/RIS-client.git")
                        url.set("https://github.com/al-dashn/RIS-client")
                    }
                }
            }
        }
    }
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.3")
    implementation("com.android.installreferrer:installreferrer:2.2")
}
