import frappe
from frappe import _
from frappe.email.doctype.newsletter.newsletter import get_default_email_group
from frappe.rate_limiter import rate_limit
from frappe.utils import validate_email_address


@frappe.whitelist(allow_guest=True)
@rate_limit(limit=10, seconds=60 * 60)
def subscribe(email, email_group=None):
	"""API endpoint to directly subscribe an email to a group without confirmation email."""

	if email_group is None:
		email_group = get_default_email_group()

	try:
		# Ensure the Email Group exists
		group = frappe.get_doc("Email Group", email_group)
	except frappe.DoesNotExistError:
		# If not, create it
		group = frappe.get_doc({"doctype": "Email Group", "title": email_group}).insert(ignore_permissions=True)

	# Ignore permissions and add the subscriber
	frappe.flags.ignore_permissions = True
	add_subscribers(email_group, email)
	frappe.db.commit()

	return {"status": "success", "message": f"{email} has been added to the Email Group {email_group}."}


@frappe.whitelist()
def add_subscribers(name, email_list):
	if not isinstance(email_list, list | tuple):
		email_list = email_list.replace(",", "\n").split("\n")

	template = frappe.db.get_value("Email Group", name, "welcome_email_template")
	welcome_email = frappe.get_doc("Email Template", template) if template else None

	count = 0
	for email in email_list:
		email = email.strip()
		parsed_email = validate_email_address(email, False)

		if parsed_email:
			if not frappe.db.get_value("Email Group Member", {"email_group": name, "email": parsed_email}):
				frappe.get_doc(
					{"doctype": "Email Group Member", "email_group": name, "email": parsed_email}
				).insert(ignore_permissions=frappe.flags.ignore_permissions)

				count += 1
			else:
				pass
		else:
			frappe.msgprint(_("{0} is not a valid Email Address").format(email))

	frappe.msgprint(_("{0} subscribers added").format(count))

	return frappe.get_doc("Email Group", name).update_total_subscribers()
