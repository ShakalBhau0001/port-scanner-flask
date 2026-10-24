import ipaddress
import socket

from core.config import MAX_PORTS_PER_SCAN


# message of this error is safe to show directly to the user
class ValidationError(Exception):
    pass


def resolve_target(raw_target):
    target = (raw_target or "").strip()
    if not target:
        raise ValidationError("Please enter a target IP address or hostname.")

    # if it is already a valid IP, no DNS lookup needed
    try:
        ipaddress.ip_address(target)
        return target, target
    except ValueError:
        pass

    try:
        resolved_ip = socket.gethostbyname(target)
    except socket.gaierror:
        raise ValidationError(
            f"Could not resolve '{target}'. Check the spelling, or enter an IP address directly."
        )
    except Exception:  # noqa: BLE001
        raise ValidationError(f"Could not resolve '{target}' to an address.")

    return target, resolved_ip


def parse_port_range(start_raw, end_raw):
    try:
        start_port = int(str(start_raw).strip())
        end_port = int(str(end_raw).strip())
    except (TypeError, ValueError):
        raise ValidationError("Ports must be whole numbers between 1 and 65535.")

    if start_port < 1 or start_port > 65535 or end_port < 1 or end_port > 65535:
        raise ValidationError("Ports must be between 1 and 65535.")

    if start_port > end_port:
        raise ValidationError("The start port must be less than or equal to the end port.")

    total_ports = end_port - start_port + 1
    if total_ports > MAX_PORTS_PER_SCAN:
        raise ValidationError(
            f"That range covers {total_ports:,} ports. To keep scans fast, "
            f"please narrow it to {MAX_PORTS_PER_SCAN:,} ports or fewer."
        )

    return start_port, end_port
