import re

class DisableCSRFForAPI:
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if re.match(r"^/api/.*", request.path):
            setattr(request, "_dont_enforce_csrf_checks", True)
        return self.get_response(request)
    