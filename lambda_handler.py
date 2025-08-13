try:
    from mangum import Mangum
    from api.main import app
    # AWS Lambda handler using Mangum adapter
    handler = Mangum(app, lifespan="off")
except ImportError as e:
    print(f"Import error: {e}")
    # Fallback handler for deployment issues
    def handler(event, context):
        return {
            'statusCode': 500,
            'body': f'Import error: {str(e)}'
        }