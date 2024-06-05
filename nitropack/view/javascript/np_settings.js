jQuery(document).ready(function ($) {
    class nitropackSettings {
        constructor() {
            this.enabled_settings = [];
            this.cacheWarmUp();
        }
        cacheWarmUp() {        
            const setting_id = '#warmup-status',
                msg_wrapper = $('#loading-warmup-status'),
                msg_icon = msg_wrapper.find('.icon'),
                msg_text = msg_wrapper.find('.msg'),
                nitroSelf = this;

            $(setting_id).change(function () {
                if ($(this).is(':checked')) {
                    estimateWarmup();
                } else {
                    disableWarmup();
                }
            });
            var disableWarmup = () => {
                $.post(ajaxurl, {
                    action: 'nitropack_disable_warmup',
                    nonce: np_settings.nitroNonce
                }, function (response) {
                    var resp = JSON.parse(response);
                    if (resp.type == "success") {
                        nitroSelf.removeElement(nitroSelf.enabled_settings, 'cacheWarmUp');
                        NitropackUI.triggerToast('success', np_settings.success_msg);
                    } else {
                        NitropackUI.triggerToast('error', np_settings.error_msg);
                    }
                });
            }

            var estimateWarmup = (id, retry) => {
                id = id || null;
                retry = retry || 0;
                msg_wrapper.removeClass('hidden');
                if (!id) {
                    msg_text.text(np_settings.est_cachewarmup_msg);
                    $.post(ajaxurl, {
                        action: 'nitropack_estimate_warmup',
                        nonce: np_settings.nitroNonce
                    }, function (response) {
                        var resp = JSON.parse(response);
                        if (resp.type == "success") {
                            setTimeout((function (id) {
                                estimateWarmup(id);
                            })(resp.res), 1000);
                        } else {
                            $(setting_id).prop("checked", true);
                            msg_text.text(resp.message);
                            
                            msg_icon.attr('src', np_settings.nitro_plugin_url + '/view/images/info.svg');
                            setTimeout(function () {
                                msg_wrapper.addClass('hidden');
                            }, 3000);
                        
                        }
                    });
                } else {
                    $.post(ajaxurl, {
                        action: 'nitropack_estimate_warmup',
                        estId: id,
                        nonce: np_settings.nitroNonce
                    }, function (response) {
                        var resp = JSON.parse(response);
                        if (resp.type == "success") {
                            if (isNaN(resp.res) || resp.res == -1) { // Still calculating
                                if (retry >= 10) {
                                    $(setting_id).prop("checked", false);
                                    msg_icon.attr('src', np_settings.nitro_plugin_url + '/view/images/info.svg');
                                    msg_text.text(resp.message);
                              
                                    setTimeout(function () {
                                        msg_wrapper.addClass('hidden');
                                    }, 3000);
                                } else {
                                    setTimeout((function (id, retry) {
                                        estimateWarmup(id, retry);
                                    })(id, retry + 1), 1000);
                                }
                            } else {
                                if (resp.res == 0) {
                                    $(setting_id).prop("checked", false);
                                    msg_icon.attr('src', np_settings.nitro_plugin_url + '/view/images/info.svg');
                                    msg_text.text(resp.message);
                                    setTimeout(function () {
                                        msg_wrapper.addClass('hidden');
                                    }, 3000);
                                } else {
                                    enableWarmup();
                                }
                            }
                        } else {
                            msg_text.text(resp.message);
                            setTimeout(function () {
                                msg_wrapper.addClass('hidden');
                            }, 3000);
                        }
                    });
                }
            }
            var enableWarmup = () => {
                $.post(ajaxurl, {
                    action: 'nitropack_enable_warmup',
                    nonce: np_settings.nitroNonce
                }, function (response) {
                    var resp = JSON.parse(response);
                    if (resp.type == "success") {
                        nitroSelf.enabled_settings.push('cacheWarmUp');
                        $(setting_id).prop("checked", true);
                        msg_wrapper.addClass('hidden');                     
                        NitropackUI.triggerToast('success', np_settings.success_msg);
                    } else {
                        setTimeout(enableWarmup, 1000);
                    }
                });
            }

            var loadWarmupStatus = function () {
                $.ajax({
                    url: ajaxurl,
                    type: "POST",
                    data: {
                        action: "nitropack_warmup_stats",
                        nonce: np_settings.nitroNonce
                    },
                    dataType: "json",
                    success: function (resp) {
                        if (resp.type == "success") {

                            nitroSelf.enabled_settings.push('cacheWarmUp');
                            $(setting_id).prop("checked", !!resp.stats.status);
                            msg_wrapper.addClass('hidden');
                        } else {
                            setTimeout(loadWarmupStatus, 500);
                        }
                    }
                });
            }

            loadWarmupStatus();
        }
        removeElement(array, value) {
            const index = array.indexOf(value);
            if (index !== -1) {
                array.splice(index, 1);
            }
        }
    }
    const NitroPackSettings = new nitropackSettings();
});