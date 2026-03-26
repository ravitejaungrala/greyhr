# Use the official AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.12

# Copy requirements.txt
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install system dependencies for packages like pycairo and opencv
RUN dnf install -y \
    gcc \
    cairo-devel \
    pkgconfig \
    python3-devel \
    mesa-libGL \
    && dnf clean all

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . ${LAMBDA_TASK_ROOT}

# Set the CMD to your handler (fileName.methodName)
CMD [ "main.handler" ]
