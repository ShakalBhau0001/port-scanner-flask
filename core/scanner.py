import socket
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from core.config import CONNECT_TIMEOUT, KNOWN_SERVICES, MAX_WORKERS


def guess_service(port):
    if port in KNOWN_SERVICES:
        return KNOWN_SERVICES[port]
    try:
        return socket.getservbyport(port, "tcp").upper()
    except OSError:
        return "Unknown"


def scan_port(ip, port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(CONNECT_TIMEOUT)
            result = sock.connect_ex((ip, port))
            if result == 0:
                return {"port": port, "status": "open", "service": guess_service(port)}
            return {"port": port, "status": "closed", "service": "-"}
    except TimeoutError:
        return {"port": port, "status": "filtered", "service": "-"}
    except OSError:
        return {"port": port, "status": "error", "service": "-"}


def run_scan(ip, start_port, end_port):
    ports = range(start_port, end_port + 1)
    worker_count = min(MAX_WORKERS, len(ports))
    results = []
    start_time = time.perf_counter()
    # every port is checked in its own thread, so the scan finishes fast
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        futures = [pool.submit(scan_port, ip, port) for port in ports]
        for future in as_completed(futures):
            results.append(future.result())
    elapsed = time.perf_counter() - start_time
    results.sort(key=lambda r: r["port"])
    open_count = sum(1 for r in results if r["status"] == "open")
    closed_count = sum(1 for r in results if r["status"] == "closed")
    other_count = len(results) - open_count - closed_count
    stats = {
        "total_ports": len(results),
        "open_count": open_count,
        "closed_count": closed_count,
        "other_count": other_count,
        "elapsed_seconds": round(elapsed, 2),
    }
    return results, stats
