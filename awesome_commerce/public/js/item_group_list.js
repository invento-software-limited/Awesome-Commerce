frappe.listview_settings['Item Group'] = {
  onload: function (listview) {
    listview.page.add_menu_item(__("Update Routes"), function () {
      frappe.call({
        method: 'awesome_commerce.api.item_group.enqueue_update_item_group_routes',
        freeze: true,
        callback: function (r) {
          frappe.msgprint({
            title: __('Notification'),
            indicator: 'green',
            message: __('Item Group routes update has been queued.')
          });
        }
      });
    });
  }
};
