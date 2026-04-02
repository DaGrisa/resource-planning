namespace ResourcePlanning.Tests;

public abstract class ServiceTestBase : IDisposable
{
    protected readonly TestDbContextFactory Factory = new();

    public void Dispose()
    {
        Factory.Dispose();
    }
}
