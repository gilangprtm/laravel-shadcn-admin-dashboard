<?php

namespace Tests\Feature;

use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PreferenceCookiePersistenceTest extends TestCase
{
    public function test_plaintext_preference_cookies_survive_middleware_and_render_in_initial_html(): void
    {
        $preferences = [
            'theme_mode' => 'dark',
            'theme_preset' => 'tangerine',
            'font' => 'inter',
            'content_layout' => 'full-width',
            'navbar_style' => 'sticky',
            'sidebar_variant' => 'floating',
            'sidebar_collapsible' => 'icon',
        ];

        $response = $this->withUnencryptedCookies($preferences)->get(route('login'));

        $response->assertOk();
        $response->assertSee('data-theme-mode="dark"', false);
        $response->assertSee('data-theme-preset="tangerine"', false);
        $response->assertSee('data-font="inter"', false);
        $response->assertSee('data-content-layout="full-width"', false);
        $response->assertSee('data-navbar-style="sticky"', false);
        $response->assertSee('data-sidebar-variant="floating"', false);
        $response->assertSee('data-sidebar-collapsible="icon"', false);
        $response->assertSee('class="dark"', false);
        $response->assertInertia(fn (Assert $page) => $page
            ->where('preferences', $preferences)
        );
    }

    public function test_canonical_light_mode_overrides_legacy_dark_appearance(): void
    {
        $response = $this->withUnencryptedCookies([
            'theme_mode' => 'light',
            'appearance' => 'dark',
        ])->get(route('login'));

        $response->assertSee('data-theme-mode="light"', false);
        $response->assertDontSee('class="dark"', false);
    }

    public function test_legacy_dark_appearance_does_not_override_missing_canonical_mode(): void
    {
        $response = $this->withUnencryptedCookies(['appearance' => 'dark'])->get(route('login'));

        $response->assertSee('data-theme-mode="light"', false);
        $response->assertDontSee('class="dark"', false);
    }

    public function test_missing_preference_cookies_render_existing_defaults(): void
    {
        $response = $this->get(route('login'));

        $response->assertOk();
        $response->assertSee('data-theme-mode="light"', false);
        $response->assertSee('data-theme-preset="default"', false);
        $response->assertSee('data-content-layout="centered"', false);
        $response->assertSee('data-navbar-style="sticky"', false);
        $response->assertSee('data-sidebar-variant="sidebar"', false);
        $response->assertSee('data-sidebar-collapsible="icon"', false);
        $response->assertDontSee('class="dark"', false);
    }
}
