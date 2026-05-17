class SecurityService:
    def __init__(self):
        self.allowed_domains = ['@visiontouch.com']
        self.admin_emails = ['projectvisiontouch@gmail.com']

    def is_admin(self, email):
        if not email:
            return False
        
        # Check standard admin list
        if email in self.admin_emails:
            return True
            
        # Check approved enterprise email domains
        for domain in self.allowed_domains:
            if email.endswith(domain):
                return True
                
        return False

    def verify_auth_token(self, token):
        """
        Stub to handle secure JWT tokens from Supabase or secure clients
        """
        if not token:
            return False
        # In production, we'd verify Supabase JWT signature
        return True
