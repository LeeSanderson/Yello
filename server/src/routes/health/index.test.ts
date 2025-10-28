import { ContainerBuilder, TestHelpers } from '@/utils/testing';
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { Hono } from 'hono';
import { createHealthRoutes } from '.';
import { IDateService } from '@/services';

describe('Health Route', () => {
    let app: Hono;
    let dateService: IDateService;

    beforeEach(async () => {
        const containerBuilder = new ContainerBuilder();
        await containerBuilder.addInMemoryDatabase();
        dateService = containerBuilder.addMockDateService();
        app = TestHelpers.setupApp(createHealthRoutes, containerBuilder.toContainer());
    })

    afterEach(() => {
        mock.restore()
    })

    describe('GET /health', () => {
      it('should return OK if database active', async () => {
            // Arrange
            const currrentDate = new Date();
            (dateService.now as any).mockReturnValue(currrentDate);

            // Act
            const response = await TestHelpers.makeGetRequest(app, '/health');

            // Assert
            expect(response)
                .toBeJson(200,  
                    {
                        status: "ok",
                        service: "yellow-api",
                        database: "connected",
                        timestamp: currrentDate.toISOString(),
                    });
        });
    });
});
