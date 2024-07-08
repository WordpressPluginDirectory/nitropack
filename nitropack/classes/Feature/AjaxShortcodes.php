<?php
namespace NitroPack\Feature;

class AjaxShortcodes {
    const STAGE = "very_early";

    private $shortcodes = array();
    private $nitroScLoader = <<<'SCRIPT'
    (() => {
        document.addEventListener("DOMContentLoaded", () => {
            let ajaxElements = document.querySelectorAll(".nitro-sc-load");
            let reqData = new Set();
            ajaxElements.forEach((el) => {
                reqData.add(el.getAttribute("data-sc-meta"));
            });
            jQuery.ajax({
                type: "post",
                url: `${window.location.origin}/wp-admin/admin-ajax.php`,
                data: {
                  action: "nitro_shortcode_ajax",
                  data: Array.from(reqData),
                },
                complete: function (response) {
                  let scData = JSON.parse(response.responseText).data
                  for (let key in scData) {
                      document.querySelectorAll(`.nitro-sc-load[data-sc-meta='${key}']`).forEach( el => { el.outerHTML = scData[key]; });
                      console.log(key, scData[key]);
                  }
                },
            });
        });
    })()
SCRIPT;

    public function init($stage) {
        if (!defined("NITROPACK_AJAX_SHORTCODES")) {
            // This init method can be run at any stage. This gives the opportunity to define the constant at a later point
            // For example in a MU plugin
            return true;
        }

        $this->shortcodes = array_map("trim", explode(",", NITROPACK_AJAX_SHORTCODES));

        add_action('wp_ajax_nitro_shortcode_ajax', array($this, 'shortcodeAjax'));
        add_action('wp_ajax_nopriv_nitro_shortcode_ajax', array($this, 'shortcodeAjax'));

        add_action('wp_enqueue_scripts', function() {
            wp_add_inline_script('jquery', $this->nitroScLoader);
        });

        add_filter('pre_do_shortcode_tag', function($out, $tag, $attr) {
            if (defined("NITRO_DOING_AJAX_SHORTCODES") && NITRO_DOING_AJAX_SHORTCODES) return $out;

            if (in_array($tag, $this->shortcodes)) {
                return '<span class="nitro-sc-load" data-sc-meta="' . base64_encode(json_encode(["tag" => $tag, "attr" => $attr])) . '"></span>';
            }
            return $out;
        }, 10, 3);
    }

    public function shortcodeAjax() {
        if (!defined("NITRO_DOING_AJAX_SHORTCODES")) define("NITRO_DOING_AJAX_SHORTCODES", true);
        $this->runShortcodes();

        // In case a later hook is needed, we can and an option for it and use something like this
        //if (did_action('plugins_loaded')) {
        //    $this->runShortcodes();
        //} else {
        //    add_action('plugins_loaded', [$this, 'runShortcodes']);
        //}
    }

    public function runShortcodes() {
        $shortcodes = !empty($_POST["data"]) ? $_POST["data"] : [];
        if (empty($shortcodes)) wp_send_json_error(["message" => "Invalid shortcode input"], 400);

        $resp = [];
        foreach ($shortcodes as $shortcode) {
            $sc = json_decode(base64_decode($shortcode), true);
            $attrFlat = is_array($sc["attr"]) ? array_map(function($k, $v) { return "$k=$v"; }, array_keys($sc["attr"]), array_values($sc["attr"])) : [];
            $resp[$shortcode] = do_shortcode("[{$sc['tag']} " . implode(" ", $attrFlat) . "]");
        }

        wp_send_json_success($resp);
    }
}
